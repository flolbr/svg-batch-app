import type { RowId } from "./normalizeWorkbook";

export function toggleSelectedRow(
  selectedRowIds: RowId[],
  rowId: RowId,
): RowId[] {
  return selectedRowIds.includes(rowId)
    ? selectedRowIds.filter((selectedRowId) => selectedRowId !== rowId)
    : [...selectedRowIds, rowId];
}
