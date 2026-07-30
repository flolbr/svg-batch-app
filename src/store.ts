import { create } from "zustand";
import type { ImportedSpreadsheet } from "./data/importSpreadsheet";
import type { Project } from "./project/loadProject";

export type PanelWeights = [number, number, number];

type AppStore = {
  project: Project | null;
  ui: {
    panelWeights: PanelWeights;
  };
  sources: {
    spreadsheet: ImportedSpreadsheet | null;
    svg: null;
  };
  selection: {
    activeRowId: string | null;
    selectedRowIds: string[];
    svgObjectId: string | null;
  };
  setProject: (project: Project) => void;
  setPanelWeights: (panelWeights: PanelWeights) => void;
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
  setSpreadsheetSource: (spreadsheet) =>
    set((state) => ({
      sources: {
        ...state.sources,
        spreadsheet,
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
