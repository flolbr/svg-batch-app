import { create } from "zustand";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
import {
  normalizeWorksheet,
  type NormalizedWorksheet,
} from "./data/normalizeWorkbook";
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
  setPanelWeights: (panelWeights) =>
    set((state) => ({
      ui: {
        ...state.ui,
        panelWeights,
      },
    })),
}));
