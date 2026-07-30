import { create } from "zustand";

export type PanelWeights = [number, number, number];

type AppStore = {
  project: {
    status: "empty";
  };
  ui: {
    panelWeights: PanelWeights;
  };
  sources: {
    spreadsheet: null;
    svg: null;
  };
  selection: {
    activeRowId: string | null;
    selectedRowIds: string[];
    svgObjectId: string | null;
  };
  setPanelWeights: (panelWeights: PanelWeights) => void;
};

export const initialPanelWeights: PanelWeights = [38, 27, 35];

export const useAppStore = create<AppStore>()((set) => ({
  project: {
    status: "empty",
  },
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
  setPanelWeights: (panelWeights) =>
    set((state) => ({
      ui: {
        ...state.ui,
        panelWeights,
      },
    })),
}));
