import type { RowId } from "./normalizeWorkbook";

export type RowSelectionState = "none" | "some" | "all";

export function toggleSelectedRow(
  selectedRowIds: RowId[],
  rowId: RowId,
): RowId[] {
  return selectedRowIds.includes(rowId)
    ? selectedRowIds.filter((selectedRowId) => selectedRowId !== rowId)
    : [...selectedRowIds, rowId];
}

export function selectRows(selectedRowIds: RowId[], rowIds: RowId[]): RowId[] {
  const nextSelection = new Set(selectedRowIds);
  rowIds.forEach((rowId) => nextSelection.add(rowId));
  return [...nextSelection];
}

export function deselectRows(
  selectedRowIds: RowId[],
  rowIds: RowId[],
): RowId[] {
  const removedRowIds = new Set(rowIds);
  return selectedRowIds.filter((rowId) => !removedRowIds.has(rowId));
}

export function getRowSelectionState(
  selectedRowIds: RowId[],
  rowIds: RowId[],
): RowSelectionState {
  if (rowIds.length === 0) return "none";

  const selected = new Set(selectedRowIds);
  const selectedCount = rowIds.filter((rowId) => selected.has(rowId)).length;
  if (selectedCount === 0) return "none";
  return selectedCount === rowIds.length ? "all" : "some";
}
