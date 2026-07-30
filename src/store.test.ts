import { describe, expect, it } from "vitest";
import { initialPanelWeights, useAppStore } from "./store";

describe("useAppStore", () => {
  it("starts with empty project, source, and selection slices and default UI weights", () => {
    const state = useAppStore.getState();

    expect(state.project).toEqual({ status: "empty" });
    expect(state.ui).toEqual({ panelWeights: [38, 27, 35] });
    expect(state.sources).toEqual({ spreadsheet: null, svg: null });
    expect(state.selection).toEqual({
      activeRowId: null,
      selectedRowIds: [],
      svgObjectId: null,
    });
  });

  it("updates panel weights without changing unrelated slices or the initial tuple", () => {
    const stateBefore = useAppStore.getState();
    const initialWeightsBefore = [...initialPanelWeights];
    const panelWeights: [number, number, number] = [40, 25, 35];

    stateBefore.setPanelWeights(panelWeights);

    const stateAfter = useAppStore.getState();
    expect(stateAfter.ui.panelWeights).toEqual(panelWeights);
    expect(stateAfter.project).toBe(stateBefore.project);
    expect(stateAfter.sources).toBe(stateBefore.sources);
    expect(stateAfter.selection).toBe(stateBefore.selection);
    expect(initialPanelWeights).toEqual(initialWeightsBefore);
  });
});
