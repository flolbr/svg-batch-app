import type {
  CellValue,
  ColumnId,
  DataColumn,
  RowId,
  SourceRow,
} from "./normalizeWorkbook";

export type ManualRow = {
  id: RowId;
  values: Record<ColumnId, CellValue>;
};

export function createManualRow(
  columnIds: ColumnId[],
  createRowId: () => RowId = () => crypto.randomUUID(),
): ManualRow {
  return {
    id: createRowId(),
    values: Object.fromEntries(columnIds.map((columnId) => [columnId, null])),
  };
}

export function updateManualCell(
  rows: ManualRow[],
  rowId: RowId,
  columnId: ColumnId,
  value: string,
): ManualRow[] {
  return rows.map((row) =>
    row.id === rowId
      ? {
          ...row,
          values: {
            ...row.values,
            [columnId]: value === "" ? null : value,
          },
        }
      : row,
  );
}

export function duplicateManualRow(
  rows: ManualRow[],
  rowId: RowId,
  createRowId: () => RowId = () => crypto.randomUUID(),
): ManualRow[] {
  const rowIndex = rows.findIndex((row) => row.id === rowId);
  if (rowIndex === -1) return rows;

  const duplicate = {
    id: createRowId(),
    values: { ...rows[rowIndex].values },
  };
  return [
    ...rows.slice(0, rowIndex + 1),
    duplicate,
    ...rows.slice(rowIndex + 1),
  ];
}

export function deleteManualRow(rows: ManualRow[], rowId: RowId): ManualRow[] {
  return rows.filter((row) => row.id !== rowId);
}

export function pasteManualCells(
  rows: ManualRow[],
  startRowId: RowId,
  startColumnId: ColumnId,
  columnIds: ColumnId[],
  clipboardText: string,
  createRowId: () => RowId = () => crypto.randomUUID(),
): ManualRow[] {
  const startRowIndex = rows.findIndex((row) => row.id === startRowId);
  const startColumnIndex = columnIds.indexOf(startColumnId);
  if (startRowIndex === -1 || startColumnIndex === -1) return rows;

  const pastedRows = clipboardText
    .replace(/\r\n?/g, "\n")
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => line.split("\t"));
  const nextRows = [...rows];

  pastedRows.forEach((cells, pastedRowIndex) => {
    const targetRowIndex = startRowIndex + pastedRowIndex;
    if (!nextRows[targetRowIndex]) {
      nextRows.push(createManualRow(columnIds, createRowId));
    }

    const target = nextRows[targetRowIndex];
    const values = { ...target.values };
    cells.forEach((value, pastedColumnIndex) => {
      const columnId = columnIds[startColumnIndex + pastedColumnIndex];
      if (columnId) values[columnId] = value === "" ? null : value;
    });
    nextRows[targetRowIndex] = { ...target, values };
  });

  return nextRows;
}

export function manualRowsToSourceRows(
  rows: ManualRow[],
  columns: DataColumn[],
): SourceRow[] {
  return rows.map((row) => ({
    id: row.id,
    values: Object.fromEntries(
      columns.map((column) => {
        const value = row.values[column.id];
        if (
          column.inferredType === "number" &&
          typeof value === "string" &&
          value.trim() !== "" &&
          Number.isFinite(Number(value))
        ) {
          return [column.id, Number(value)];
        }
        return [column.id, value ?? null];
      }),
    ),
    displayedValues: Object.fromEntries(
      columns.map((column) => [
        column.id,
        row.values[column.id] === null || row.values[column.id] === undefined
          ? ""
          : String(row.values[column.id]),
      ]),
    ),
  }));
}
