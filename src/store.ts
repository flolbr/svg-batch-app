import { create } from "zustand";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
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
import type { Project } from "./project/loadProject";

export type PanelWeights = [number, number, number];
export type SpreadsheetSource = ImportedSpreadsheet & {
  data: NormalizedWorksheet;
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

      return {
        sources: {
          ...state.sources,
          spreadsheet: {
            ...spreadsheet,
            data: normalizeWorksheet(
              spreadsheet.workbook.Sheets[sheetName] ?? {},
            ),
            selectedSheetName: sheetName,
          },
        },
      };
    }),
  setSpreadsheetSource: (spreadsheet) =>
    set((state) => ({
      sources: {
        ...state.sources,
        spreadsheet: {
          ...spreadsheet,
          data: normalizeWorksheet(
            spreadsheet.workbook.Sheets[spreadsheet.sheetNames[0]] ?? {},
          ),
          selectedSheetName: spreadsheet.sheetNames[0],
        },
      },
    })),
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
