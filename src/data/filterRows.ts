import type { ColumnId, SourceRow } from "./normalizeWorkbook";
import { normalizeSearchText } from "./searchRows";

export type ColumnFilter =
  | { type: "values"; columnId: ColumnId; included: string[] }
  | {
      type: "text";
      columnId: ColumnId;
      operator: "contains" | "equals";
      value: string;
    }
  | { type: "number"; columnId: ColumnId; min?: number; max?: number }
  | { type: "date"; columnId: ColumnId; from?: string; to?: string }
  | { type: "blank"; columnId: ColumnId; blank: boolean };

export function getDistinctColumnValues(
  rows: SourceRow[],
  columnId: ColumnId,
): string[] {
  return [...new Set(rows.map((row) => row.displayedValues[columnId] ?? ""))];
}

function matchesFilter(row: SourceRow, filter: ColumnFilter): boolean {
  const displayedValue = row.displayedValues[filter.columnId] ?? "";

  switch (filter.type) {
    case "values":
      return filter.included.includes(displayedValue);
    case "text": {
      const expected = normalizeSearchText(filter.value);
      if (!expected) return true;

      const actual = normalizeSearchText(displayedValue);
      return filter.operator === "equals"
        ? actual === expected
        : actual.includes(expected);
    }
    case "number": {
      if (filter.min === undefined && filter.max === undefined) return true;

      const value = row.values[filter.columnId];
      if (typeof value !== "number" || !Number.isFinite(value)) return false;
      return (
        (filter.min === undefined || value >= filter.min) &&
        (filter.max === undefined || value <= filter.max)
      );
    }
    case "date": {
      if (!filter.from && !filter.to) return true;

      const value = row.values[filter.columnId];
      const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
      if (Number.isNaN(timestamp)) return false;

      const from = filter.from ? Date.parse(filter.from) : undefined;
      const to = filter.to
        ? Date.parse(`${filter.to}T23:59:59.999Z`)
        : undefined;
      return (
        (from === undefined || timestamp >= from) &&
        (to === undefined || timestamp <= to)
      );
    }
    case "blank": {
      const isBlank = displayedValue.trim() === "";
      return filter.blank ? isBlank : !isBlank;
    }
  }
}

export function filterRows(
  rows: SourceRow[],
  filters: ColumnFilter[],
): SourceRow[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((filter) => matchesFilter(row, filter)),
  );
}
