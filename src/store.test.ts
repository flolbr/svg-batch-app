import { describe, expect, it } from "vitest";
import { initialPanelWeights, useAppStore } from "./store";

describe("useAppStore", () => {
  it("starts with empty project, source, and selection slices and default UI weights", () => {
    const state = useAppStore.getState();

    expect(state.project).toBeNull();
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

  it("loads a validated project without changing transient state", () => {
    const stateBefore = useAppStore.getState();
    const project = {
      schemaVersion: 1 as const,
      projectId: "project-1",
      name: "Badges",
    };

    stateBefore.setProject(project);

    const stateAfter = useAppStore.getState();
    expect(stateAfter.project).toEqual(project);
    expect(stateAfter.ui).toBe(stateBefore.ui);
    expect(stateAfter.sources).toBe(stateBefore.sources);
    expect(stateAfter.selection).toBe(stateBefore.selection);
  });

  it("stores an imported workbook without changing unrelated slices", () => {
    const stateBefore = useAppStore.getState();
    const spreadsheet = {
      fileName: "customers.xlsx",
      fileSize: 123,
      sheetNames: ["Customers", "Mapping Guide"],
      workbook: {
        SheetNames: ["Customers", "Mapping Guide"],
        Sheets: {},
      },
    };

    stateBefore.setSpreadsheetSource(spreadsheet);

    const stateAfter = useAppStore.getState();
    expect(stateAfter.sources.spreadsheet).toEqual({
      ...spreadsheet,
      selectedSheetName: "Customers",
    });
    expect(stateAfter.sources.svg).toBe(stateBefore.sources.svg);
    expect(stateAfter.project).toBe(stateBefore.project);
    expect(stateAfter.ui).toBe(stateBefore.ui);
    expect(stateAfter.selection).toBe(stateBefore.selection);
  });

  it("changes only to a worksheet available in the imported workbook", () => {
    useAppStore.getState().setSpreadsheetSource({
      fileName: "customers.xlsx",
      fileSize: 123,
      sheetNames: ["Customers", "Mapping Guide"],
      workbook: {
        SheetNames: ["Customers", "Mapping Guide"],
        Sheets: {},
      },
    });

    useAppStore.getState().setSelectedWorksheet("Mapping Guide");
    expect(
      useAppStore.getState().sources.spreadsheet?.selectedSheetName,
    ).toBe("Mapping Guide");

    const stateAfterSelection = useAppStore.getState();
    stateAfterSelection.setSelectedWorksheet("Missing sheet");
    expect(useAppStore.getState()).toBe(stateAfterSelection);
  });
});
