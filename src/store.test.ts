import * as XLSX from "xlsx";
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
      columnPreferencesBySheet: {
        Customers: { visible: [], exported: [] },
      },
      data: { columns: [], rows: [] },
      manualRowsBySheet: {},
      normalizedDataBySheet: {
        Customers: { columns: [], rows: [] },
      },
      rowOverridesBySheet: {},
      selectedSheetName: "Customers",
    });
    expect(stateAfter.sources.svg).toBe(stateBefore.sources.svg);
    expect(stateAfter.project).toBe(stateBefore.project);
    expect(stateAfter.ui).toBe(stateBefore.ui);
    expect(stateAfter.selection).toBe(stateBefore.selection);
  });

  it("changes only to a worksheet available in the imported workbook", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Name"], ["Ada"]]),
      "Customers",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Notes"], ["Keep IDs stable"]]),
      "Mapping Guide",
    );
    useAppStore.getState().setSpreadsheetSource({
      fileName: "customers.xlsx",
      fileSize: 123,
      sheetNames: workbook.SheetNames,
      workbook,
    });

    expect(
      useAppStore.getState().sources.spreadsheet?.data.rows[0]
        ?.displayedValues["col-0"],
    ).toBe("Ada");

    const initialState = useAppStore.getState();
    initialState.setSelectedWorksheet("Customers");
    expect(useAppStore.getState()).toBe(initialState);

    useAppStore.getState().setSelectedWorksheet("Mapping Guide");
    expect(
      useAppStore.getState().sources.spreadsheet?.selectedSheetName,
    ).toBe("Mapping Guide");
    expect(
      useAppStore.getState().sources.spreadsheet?.data.rows[0]
        ?.displayedValues["col-0"],
    ).toBe("Keep IDs stable");

    const stateAfterSelection = useAppStore.getState();
    stateAfterSelection.setSelectedWorksheet("Missing sheet");
    expect(useAppStore.getState()).toBe(stateAfterSelection);
  });

  it("toggles selected row IDs without changing unrelated slices", () => {
    const stateBefore = useAppStore.getState();

    stateBefore.toggleRowSelection("row-1");

    const stateAfterSelection = useAppStore.getState();
    expect(stateAfterSelection.selection).toEqual({
      ...stateBefore.selection,
      selectedRowIds: ["row-1"],
    });
    expect(stateAfterSelection.project).toBe(stateBefore.project);
    expect(stateAfterSelection.sources).toBe(stateBefore.sources);
    expect(stateAfterSelection.ui).toBe(stateBefore.ui);

    stateAfterSelection.toggleRowSelection("row-1");
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([]);
  });

  it("selects, deselects, and clears row ID sets", () => {
    const store = useAppStore.getState();

    store.selectRows(["row-1", "row-2"]);
    useAppStore.getState().selectRows(["row-2", "row-3"]);
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      "row-1",
      "row-2",
      "row-3",
    ]);

    useAppStore.getState().deselectRows(["row-2"]);
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      "row-1",
      "row-3",
    ]);

    useAppStore.getState().clearRowSelection();
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([]);
  });

  it("keeps manual rows scoped to their worksheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Name"]]),
      "Members",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Plan"]]),
      "Plans",
    );
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 123,
      sheetNames: workbook.SheetNames,
      workbook,
    });

    useAppStore.getState().setManualRows([
      { id: "manual-member", values: { "col-0": "Ada" } },
    ]);
    useAppStore.getState().setSelectedWorksheet("Plans");
    useAppStore.getState().setManualRows([
      { id: "manual-plan", values: { "col-0": "Premium" } },
    ]);

    const spreadsheet = useAppStore.getState().sources.spreadsheet;
    expect(spreadsheet?.manualRowsBySheet).toEqual({
      Members: [{ id: "manual-member", values: { "col-0": "Ada" } }],
      Plans: [{ id: "manual-plan", values: { "col-0": "Premium" } }],
    });
  });

  it("keeps imported-row overrides scoped to their worksheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Name"], ["Ada"]]),
      "Members",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Plan"], ["Basic"]]),
      "Plans",
    );
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 123,
      sheetNames: workbook.SheetNames,
      workbook,
    });
    const memberRowId =
      useAppStore.getState().sources.spreadsheet?.data.rows[0].id ?? "";

    useAppStore
      .getState()
      .setRowOverrides([
        { rowId: memberRowId, values: { "col-0": "Augusta" } },
      ]);
    useAppStore.getState().setSelectedWorksheet("Plans");
    const planRowId =
      useAppStore.getState().sources.spreadsheet?.data.rows[0].id ?? "";
    useAppStore
      .getState()
      .setRowOverrides([{ rowId: planRowId, values: { "col-0": "Premium" } }]);
    useAppStore.getState().setSelectedWorksheet("Members");

    expect(
      useAppStore.getState().sources.spreadsheet?.rowOverridesBySheet,
    ).toEqual({
      Members: [{ rowId: memberRowId, values: { "col-0": "Augusta" } }],
      Plans: [{ rowId: planRowId, values: { "col-0": "Premium" } }],
    });
    expect(useAppStore.getState().sources.spreadsheet?.data.rows[0].id).toBe(
      memberRowId,
    );
  });

  it("keeps visible and exported column preferences scoped to each worksheet", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Name", "City"],
        ["Ada", "London"],
      ]),
      "Members",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Plan"], ["Basic"]]),
      "Plans",
    );
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 123,
      sheetNames: workbook.SheetNames,
      workbook,
    });

    expect(
      useAppStore.getState().sources.spreadsheet?.columnPreferencesBySheet,
    ).toEqual({
      Members: {
        visible: ["col-0", "col-1"],
        exported: ["col-0", "col-1"],
      },
    });

    useAppStore.getState().setColumnPreferences({
      visible: ["col-0"],
      exported: ["col-1"],
    });
    useAppStore.getState().setSelectedWorksheet("Plans");
    useAppStore.getState().setColumnPreferences({
      visible: [],
      exported: ["col-0"],
    });

    expect(
      useAppStore.getState().sources.spreadsheet?.columnPreferencesBySheet,
    ).toEqual({
      Members: { visible: ["col-0"], exported: ["col-1"] },
      Plans: { visible: [], exported: ["col-0"] },
    });
  });
});
