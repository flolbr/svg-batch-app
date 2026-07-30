import * as XLSX from "xlsx";

export type ColumnId = string;
export type RowId = string;

export type DataColumn = {
  id: ColumnId;
  sourceHeader: string;
  displayName: string;
  sourceIndex: number;
  inferredType: "text" | "number" | "date" | "boolean" | "mixed";
};

export type CellValue = string | number | boolean | null;

export type SourceRow = {
  id: RowId;
  values: Record<ColumnId, CellValue>;
  displayedValues: Record<ColumnId, string>;
};

export type NormalizedWorksheet = {
  columns: DataColumn[];
  rows: SourceRow[];
};

type CellKind = DataColumn["inferredType"];

function dateFromSerial(value: number): string | undefined {
  const date = XLSX.SSF.parse_date_code(value);
  if (!date) return undefined;

  return new Date(
    Date.UTC(
      date.y,
      date.m - 1,
      date.d,
      date.H,
      date.M,
      date.S,
      Math.round(date.u * 1000),
    ),
  ).toISOString();
}

function readCell(cell: XLSX.CellObject | undefined): {
  value: CellValue;
  displayedValue: string;
  kind?: CellKind;
} {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") {
    return { value: null, displayedValue: "" };
  }

  const displayedValue = cell.w ?? XLSX.utils.format_cell({ ...cell });
  if (cell.t === "d" && cell.v instanceof Date) {
    return { value: cell.v.toISOString(), displayedValue, kind: "date" };
  }

  if (
    cell.t === "n" &&
    typeof cell.v === "number" &&
    cell.z &&
    XLSX.SSF.is_date(cell.z)
  ) {
    const value = dateFromSerial(cell.v);
    if (value) return { value, displayedValue, kind: "date" };
  }

  if (typeof cell.v === "string") {
    return { value: cell.v, displayedValue, kind: "text" };
  }
  if (typeof cell.v === "number") {
    return { value: cell.v, displayedValue, kind: "number" };
  }
  if (typeof cell.v === "boolean") {
    return { value: cell.v, displayedValue, kind: "boolean" };
  }

  return { value: String(cell.v), displayedValue, kind: "text" };
}

function inferType(kinds: Set<CellKind>): DataColumn["inferredType"] {
  if (kinds.size === 0) return "text";
  if (kinds.size === 1) return [...kinds][0];
  return "mixed";
}

export function normalizeWorksheet(
  worksheet: XLSX.WorkSheet,
  createRowId: () => string = () => crypto.randomUUID(),
): NormalizedWorksheet {
  const reference = worksheet["!ref"];
  if (!reference) return { columns: [], rows: [] };

  const range = XLSX.utils.decode_range(reference);
  const names = new Map<string, number>();
  const kinds = Array.from(
    { length: range.e.c - range.s.c + 1 },
    () => new Set<CellKind>(),
  );
  const columns = Array.from({ length: kinds.length }, (_, sourceIndex) => {
    const address = XLSX.utils.encode_cell({
      r: range.s.r,
      c: range.s.c + sourceIndex,
    });
    const displayedHeader = readCell(worksheet[address]).displayedValue;
    const header = (
      sourceIndex === 0
        ? displayedHeader.replace(/^\uFEFF/, "")
        : displayedHeader
    ).trim();
    const sourceHeader = header || `Column ${sourceIndex + 1}`;
    const count = (names.get(sourceHeader) ?? 0) + 1;
    names.set(sourceHeader, count);

    return {
      id: `col-${sourceIndex}`,
      sourceHeader,
      displayName: count === 1 ? sourceHeader : `${sourceHeader} (${count})`,
      sourceIndex,
      inferredType: "text" as const,
    };
  });

  const rows: SourceRow[] = [];
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex += 1) {
    const values: Record<ColumnId, CellValue> = {};
    const displayedValues: Record<ColumnId, string> = {};
    columns.forEach((column, sourceIndex) => {
      const address = XLSX.utils.encode_cell({
        r: rowIndex,
        c: range.s.c + sourceIndex,
      });
      const cell = readCell(worksheet[address]);
      values[column.id] = cell.value;
      displayedValues[column.id] = cell.displayedValue;
      if (cell.kind) kinds[sourceIndex].add(cell.kind);
    });
    rows.push({ id: createRowId(), values, displayedValues });
  }

  return {
    columns: columns.map((column, index) => ({
      ...column,
      inferredType: inferType(kinds[index]),
    })),
    rows,
  };
}
