import { create } from "zustand";
import {
  createColumnPreferences,
  type ColumnPreferences,
} from "./data/columnPreferences";
import type { ColumnFilter } from "./data/filterRows";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
import type { ManualRow } from "./data/manualRows";
import {
  normalizeWorksheet,
  type CellValue,
  type NormalizedWorksheet,
  type RowId,
} from "./data/normalizeWorkbook";
import {
  deselectRows,
  selectRows,
  toggleSelectedRow,
} from "./data/rowSelection";
import type { RowOverride } from "./data/rowOverrides";
import type { DataProjectState } from "./project/dataProjectState";
import type { Project } from "./project/loadProject";
import type { ImportedSvg } from "./svg/importSvg";

export type PanelWeights = [number, number, number];
export type SpreadsheetSource = Omit<ImportedSpreadsheet, "workbook"> & {
  columnPreferencesBySheet: Record<string, ColumnPreferences>;
  columnFiltersBySheet: Record<string, ColumnFilter[]>;
  data: NormalizedWorksheet;
  manualRowsBySheet: Record<string, ManualRow[]>;
  normalizedDataBySheet: Record<string, NormalizedWorksheet>;
  rowOverridesBySheet: Record<string, RowOverride[]>;
  selectedRowIdsBySheet: Record<string, RowId[]>;
  selectedSheetName: string;
  workbook?: ImportedSpreadsheet["workbook"];
};

type AppStore = {
  project: Project | null;
  ui: {
    panelWeights: PanelWeights;
  };
  sources: {
    spreadsheet: SpreadsheetSource | null;
    svg: ImportedSvg | null;
  };
  selection: {
    activeRowId: string | null;
    selectedRowIds: string[];
    svgObjectId: string | null;
  };
  setProject: (project: Project) => void;
  setPanelWeights: (panelWeights: PanelWeights) => void;
  setSelectedWorksheet: (sheetName: string) => void;
  setManualRows: (rows: ManualRow[]) => void;
  setColumnFilters: (filters: ColumnFilter[]) => void;
  setColumnPreferences: (preferences: ColumnPreferences) => void;
  setRowOverrides: (overrides: RowOverride[]) => void;
  setSpreadsheetSource: (spreadsheet: ImportedSpreadsheet) => void;
  setSvgSource: (svg: ImportedSvg) => void;
  setSvgObjectSelection: (id: string | null) => void;
  setActiveRow: (rowId: RowId | null) => void;
  clearRowSelection: () => void;
  deselectRows: (rowIds: RowId[]) => void;
  selectRows: (rowIds: RowId[]) => void;
  toggleRowSelection: (rowId: RowId) => void;
};

export const initialPanelWeights: PanelWeights = [38, 27, 35];

function getProjectData(spreadsheet: SpreadsheetSource): DataProjectState {
  return {
    fileName: spreadsheet.fileName,
    fileSize: spreadsheet.fileSize,
    sheetNames: spreadsheet.sheetNames,
    selectedSheetName: spreadsheet.selectedSheetName,
    worksheets: Object.fromEntries(
      spreadsheet.sheetNames.map((sheetName) => [
        sheetName,
        {
          data: spreadsheet.normalizedDataBySheet[sheetName],
          selectedRowIds: spreadsheet.selectedRowIdsBySheet[sheetName] ?? [],
          filters: spreadsheet.columnFiltersBySheet[sheetName] ?? [],
          rowOverrides: (
            spreadsheet.rowOverridesBySheet[sheetName] ?? []
          ).map((override) => ({
            rowId: override.rowId,
            values: Object.fromEntries(
              Object.entries(override.values).filter(
                (entry): entry is [string, CellValue] =>
                  entry[1] !== undefined,
              ),
            ),
          })),
          manualRows: spreadsheet.manualRowsBySheet[sheetName] ?? [],
          columnPreferences:
            spreadsheet.columnPreferencesBySheet[sheetName] ??
            createColumnPreferences(
              spreadsheet.normalizedDataBySheet[sheetName].columns.map(
                (column) => column.id,
              ),
            ),
        },
      ]),
    ),
  };
}

function restoreSpreadsheet(data: DataProjectState): SpreadsheetSource {
  return {
    fileName: data.fileName,
    fileSize: data.fileSize,
    sheetNames: data.sheetNames,
    selectedSheetName: data.selectedSheetName,
    data: data.worksheets[data.selectedSheetName].data,
    normalizedDataBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].data,
      ]),
    ),
    selectedRowIdsBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].selectedRowIds,
      ]),
    ),
    columnFiltersBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].filters,
      ]),
    ),
    rowOverridesBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].rowOverrides,
      ]),
    ),
    manualRowsBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].manualRows,
      ]),
    ),
    columnPreferencesBySheet: Object.fromEntries(
      data.sheetNames.map((sheetName) => [
        sheetName,
        data.worksheets[sheetName].columnPreferences,
      ]),
    ),
  };
}

function spreadsheetState(
  state: AppStore,
  spreadsheet: SpreadsheetSource,
  selectedRowIds = state.selection.selectedRowIds,
) {
  return {
    project: state.project
      ? { ...state.project, data: getProjectData(spreadsheet) }
      : null,
    selection: {
      ...state.selection,
      activeRowId: reconciledActiveRowId(
        state.selection.activeRowId,
        selectedRowIds,
      ),
      selectedRowIds,
    },
    sources: {
      ...state.sources,
      spreadsheet,
    },
  };
}

function reconciledActiveRowId(
  activeRowId: RowId | null,
  selectedRowIds: RowId[],
): RowId | null {
  if (activeRowId && selectedRowIds.includes(activeRowId)) {
    return activeRowId;
  }

  return selectedRowIds[0] ?? null;
}

function selectedRowsState(state: AppStore, selectedRowIds: RowId[]) {
  const spreadsheet = state.sources.spreadsheet;
  if (!spreadsheet) {
    return {
      selection: {
        ...state.selection,
        activeRowId: reconciledActiveRowId(
          state.selection.activeRowId,
          selectedRowIds,
        ),
        selectedRowIds,
      },
    };
  }

  return spreadsheetState(
    state,
    {
      ...spreadsheet,
      selectedRowIdsBySheet: {
        ...spreadsheet.selectedRowIdsBySheet,
        [spreadsheet.selectedSheetName]: selectedRowIds,
      },
    },
    selectedRowIds,
  );
}

export const useAppStore = create<AppStore>()((set) => ({
  project: null,
  ui: {
    panelWeights: initialPanelWeights,
  },
  sources: {
    spreadsheet: null,
    svg: null,
  },
  selection: {
    activeRowId: null,
    selectedRowIds: [],
    svgObjectId: null,
  },
  setProject: (project) =>
    set((state) => {
      if (!project.data) return { project };

      const spreadsheet = restoreSpreadsheet(project.data);
      return {
        project,
        sources: {
          ...state.sources,
          spreadsheet,
        },
        selection: {
          ...state.selection,
          activeRowId: reconciledActiveRowId(
            state.selection.activeRowId,
            spreadsheet.selectedRowIdsBySheet[
              spreadsheet.selectedSheetName
            ] ?? [],
          ),
          selectedRowIds:
            spreadsheet.selectedRowIdsBySheet[
              spreadsheet.selectedSheetName
            ] ?? [],
        },
      };
    }),
  setSelectedWorksheet: (sheetName) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (
        !spreadsheet?.sheetNames.includes(sheetName) ||
        spreadsheet.selectedSheetName === sheetName
      ) {
        return state;
      }

      const data = spreadsheet.normalizedDataBySheet[sheetName];
      if (!data) return state;

      return spreadsheetState(
        state,
        {
          ...spreadsheet,
          data,
          selectedSheetName: sheetName,
        },
        spreadsheet.selectedRowIdsBySheet[sheetName] ?? [],
      );
    }),
  setSpreadsheetSource: (spreadsheet) =>
    set((state) => {
      const selectedSheetName = spreadsheet.sheetNames[0];
      const normalizedDataBySheet = Object.fromEntries(
        spreadsheet.sheetNames.map((sheetName) => [
          sheetName,
          normalizeWorksheet(spreadsheet.workbook.Sheets[sheetName] ?? {}),
        ]),
      );
      const data = normalizedDataBySheet[selectedSheetName];
      const columnPreferencesBySheet = Object.fromEntries(
        spreadsheet.sheetNames.map((sheetName) => [
          sheetName,
          createColumnPreferences(
            normalizedDataBySheet[sheetName].columns.map((column) => column.id),
          ),
        ]),
      );
      return spreadsheetState(
        state,
        {
          ...spreadsheet,
          columnFiltersBySheet: {},
          columnPreferencesBySheet,
          data,
          manualRowsBySheet: {},
          normalizedDataBySheet,
          rowOverridesBySheet: {},
          selectedRowIdsBySheet: {},
          selectedSheetName,
        },
        [],
      );
    }),
  setSvgSource: (svg) =>
    set((state) => ({
      selection: {
        ...state.selection,
        svgObjectId: null,
      },
      sources: {
        ...state.sources,
        svg,
      },
    })),
  setSvgObjectSelection: (svgObjectId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        svgObjectId,
      },
    })),
  setActiveRow: (rowId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        activeRowId: reconciledActiveRowId(
          rowId,
          state.selection.selectedRowIds,
        ),
      },
    })),
  setColumnFilters: (filters) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        columnFiltersBySheet: {
          ...spreadsheet.columnFiltersBySheet,
          [spreadsheet.selectedSheetName]: filters,
        },
      });
    }),
  setColumnPreferences: (preferences) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        columnPreferencesBySheet: {
          ...spreadsheet.columnPreferencesBySheet,
          [spreadsheet.selectedSheetName]: preferences,
        },
      });
    }),
  setManualRows: (rows) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        manualRowsBySheet: {
          ...spreadsheet.manualRowsBySheet,
          [spreadsheet.selectedSheetName]: rows,
        },
      });
    }),
  setRowOverrides: (overrides) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return spreadsheetState(state, {
        ...spreadsheet,
        rowOverridesBySheet: {
          ...spreadsheet.rowOverridesBySheet,
          [spreadsheet.selectedSheetName]: overrides,
        },
      });
    }),
  clearRowSelection: () => set((state) => selectedRowsState(state, [])),
  deselectRows: (rowIds) =>
    set((state) =>
      selectedRowsState(
        state,
        deselectRows(state.selection.selectedRowIds, rowIds),
      ),
    ),
  selectRows: (rowIds) =>
    set((state) =>
      selectedRowsState(
        state,
        selectRows(state.selection.selectedRowIds, rowIds),
      ),
    ),
  toggleRowSelection: (rowId) =>
    set((state) =>
      selectedRowsState(
        state,
        toggleSelectedRow(state.selection.selectedRowIds, rowId),
      ),
    ),
  setPanelWeights: (panelWeights) =>
    set((state) => ({
      ui: {
        ...state.ui,
        panelWeights,
      },
    })),
}));
