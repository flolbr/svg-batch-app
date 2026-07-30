import { create } from "zustand";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
import type { ManualRow } from "./data/manualRows";
import {
  normalizeWorksheet,
  type NormalizedWorksheet,
  type RowId,
} from "./data/normalizeWorkbook";
import {
  deselectRows,
  selectRows,
  toggleSelectedRow,
} from "./data/rowSelection";
import type { RowOverride } from "./data/rowOverrides";
import type { Project } from "./project/loadProject";

export type PanelWeights = [number, number, number];
export type SpreadsheetSource = ImportedSpreadsheet & {
  data: NormalizedWorksheet;
  manualRowsBySheet: Record<string, ManualRow[]>;
  normalizedDataBySheet: Record<string, NormalizedWorksheet>;
  rowOverridesBySheet: Record<string, RowOverride[]>;
  selectedSheetName: string;
};

type AppStore = {
  project: Project | null;
  ui: {
    panelWeights: PanelWeights;
  };
  sources: {
    spreadsheet: SpreadsheetSource | null;
    svg: null;
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
  setRowOverrides: (overrides: RowOverride[]) => void;
  setSpreadsheetSource: (spreadsheet: ImportedSpreadsheet) => void;
  clearRowSelection: () => void;
  deselectRows: (rowIds: RowId[]) => void;
  selectRows: (rowIds: RowId[]) => void;
  toggleRowSelection: (rowId: RowId) => void;
};

export const initialPanelWeights: PanelWeights = [38, 27, 35];

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
  setProject: (project) => set({ project }),
  setSelectedWorksheet: (sheetName) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (
        !spreadsheet?.sheetNames.includes(sheetName) ||
        spreadsheet.selectedSheetName === sheetName
      ) {
        return state;
      }

      const data =
        spreadsheet.normalizedDataBySheet[sheetName] ??
        normalizeWorksheet(spreadsheet.workbook.Sheets[sheetName] ?? {});
      return {
        sources: {
          ...state.sources,
          spreadsheet: {
            ...spreadsheet,
            data,
            normalizedDataBySheet: {
              ...spreadsheet.normalizedDataBySheet,
              [sheetName]: data,
            },
            selectedSheetName: sheetName,
          },
        },
      };
    }),
  setSpreadsheetSource: (spreadsheet) =>
    set((state) => {
      const selectedSheetName = spreadsheet.sheetNames[0];
      const data = normalizeWorksheet(
        spreadsheet.workbook.Sheets[selectedSheetName] ?? {},
      );
      return {
        sources: {
          ...state.sources,
          spreadsheet: {
            ...spreadsheet,
            data,
            manualRowsBySheet: {},
            normalizedDataBySheet: { [selectedSheetName]: data },
            rowOverridesBySheet: {},
            selectedSheetName,
          },
        },
      };
    }),
  setManualRows: (rows) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return {
        sources: {
          ...state.sources,
          spreadsheet: {
            ...spreadsheet,
            manualRowsBySheet: {
              ...spreadsheet.manualRowsBySheet,
              [spreadsheet.selectedSheetName]: rows,
            },
          },
        },
      };
    }),
  setRowOverrides: (overrides) =>
    set((state) => {
      const spreadsheet = state.sources.spreadsheet;
      if (!spreadsheet) return state;

      return {
        sources: {
          ...state.sources,
          spreadsheet: {
            ...spreadsheet,
            rowOverridesBySheet: {
              ...spreadsheet.rowOverridesBySheet,
              [spreadsheet.selectedSheetName]: overrides,
            },
          },
        },
      };
    }),
  clearRowSelection: () =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedRowIds: [],
      },
    })),
  deselectRows: (rowIds) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedRowIds: deselectRows(state.selection.selectedRowIds, rowIds),
      },
    })),
  selectRows: (rowIds) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedRowIds: selectRows(state.selection.selectedRowIds, rowIds),
      },
    })),
  toggleRowSelection: (rowId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedRowIds: toggleSelectedRow(
          state.selection.selectedRowIds,
          rowId,
        ),
      },
    })),
  setPanelWeights: (panelWeights) =>
    set((state) => ({
      ui: {
        ...state.ui,
        panelWeights,
      },
    })),
}));
