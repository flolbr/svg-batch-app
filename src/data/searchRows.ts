import Fuse from "fuse.js";
import type { ColumnId, SourceRow } from "./normalizeWorkbook";

export type SearchDocument = {
  rowId: string;
  all: string;
  byColumn: Record<ColumnId, string>;
};

export type RowSearchIndex = {
  all: Fuse<SearchDocument>;
  byColumn: Record<ColumnId, Fuse<SearchDocument>>;
};

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createRowSearchIndex(
  rows: SourceRow[],
  columnIds: ColumnId[],
): RowSearchIndex {
  const documents = rows.map((row) => {
    const byColumn = Object.fromEntries(
      columnIds.map((columnId) => [
        columnId,
        normalizeSearchText(row.displayedValues[columnId] ?? ""),
      ]),
    );

    return {
      rowId: row.id,
      all: Object.values(byColumn).join(" "),
      byColumn,
    };
  });

  const options = {
    ignoreFieldNorm: true,
    ignoreLocation: true,
    threshold: 0.3,
    tokenMatch: "all" as const,
    useTokenSearch: true,
  };

  return {
    all: new Fuse(documents, { ...options, keys: [["all"]] }),
    byColumn: Object.fromEntries(
      columnIds.map((columnId) => [
        columnId,
        new Fuse(documents, {
          ...options,
          keys: [["byColumn", columnId]],
        }),
      ]),
    ),
  };
}

export function searchRows(
  index: RowSearchIndex,
  rows: SourceRow[],
  query: string,
  columnId: ColumnId | "all",
): SourceRow[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return rows;

  const fuse = columnId === "all" ? index.all : index.byColumn[columnId];
  if (!fuse) return [];

  const matchingIds = new Set(
    fuse.search(normalizedQuery).map((result) => result.item.rowId),
  );

  return rows.filter((row) => matchingIds.has(row.id));
}
