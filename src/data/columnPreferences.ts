import type { ColumnId } from "./normalizeWorkbook";

export type ColumnPreferences = {
  visible: ColumnId[];
  exported: ColumnId[];
};

export function createColumnPreferences(
  columnIds: ColumnId[],
): ColumnPreferences {
  return {
    visible: [...columnIds],
    exported: [...columnIds],
  };
}

export function setColumnPreference(
  preferences: ColumnPreferences,
  preference: keyof ColumnPreferences,
  columnId: ColumnId,
  enabled: boolean,
  columnIds: ColumnId[],
): ColumnPreferences {
  const selected = new Set(preferences[preference]);
  if (enabled) {
    selected.add(columnId);
  } else {
    selected.delete(columnId);
  }

  return {
    ...preferences,
    [preference]: columnIds.filter((id) => selected.has(id)),
  };
}
