import type {
  CellValue,
  ColumnId,
  DataColumn,
  RowId,
  SourceRow,
} from "./normalizeWorkbook";

export type RowOverride = {
  rowId: RowId;
  values: Partial<Record<ColumnId, CellValue>>;
};

function typedOverrideValue(value: CellValue, column: DataColumn): CellValue {
  if (
    column.inferredType === "number" &&
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return value;
}

export function updateRowOverride(
  overrides: RowOverride[],
  sourceRow: SourceRow,
  columnId: ColumnId,
  input: string,
): RowOverride[] {
  const current = overrides.find((override) => override.rowId === sourceRow.id);
  const values = { ...current?.values };

  if (input === (sourceRow.displayedValues[columnId] ?? "")) {
    delete values[columnId];
  } else {
    values[columnId] = input === "" ? null : input;
  }

  const otherOverrides = overrides.filter(
    (override) => override.rowId !== sourceRow.id,
  );
  return Object.keys(values).length === 0
    ? otherOverrides
    : [...otherOverrides, { rowId: sourceRow.id, values }];
}

export function resetRowOverride(
  overrides: RowOverride[],
  rowId: RowId,
): RowOverride[] {
  return overrides.filter((override) => override.rowId !== rowId);
}

export function getEffectiveSourceRows(
  sourceRows: SourceRow[],
  overrides: RowOverride[],
  columns: DataColumn[],
): SourceRow[] {
  if (overrides.length === 0) return sourceRows;

  const overridesByRowId = new Map(
    overrides.map((override) => [override.rowId, override]),
  );
  return sourceRows.map((sourceRow) => {
    const override = overridesByRowId.get(sourceRow.id);
    if (!override) return sourceRow;

    return {
      id: sourceRow.id,
      values: Object.fromEntries(
        columns.map((column) => {
          const overrideValue = override.values[column.id];
          return [
            column.id,
            Object.hasOwn(override.values, column.id)
              ? typedOverrideValue(overrideValue ?? null, column)
              : sourceRow.values[column.id],
          ];
        }),
      ),
      displayedValues: Object.fromEntries(
        columns.map((column) => {
          const overrideValue = override.values[column.id];
          return [
            column.id,
            Object.hasOwn(override.values, column.id)
              ? overrideValue === null || overrideValue === undefined
                ? ""
                : String(overrideValue)
              : (sourceRow.displayedValues[column.id] ?? ""),
          ];
        }),
      ),
    };
  });
}
