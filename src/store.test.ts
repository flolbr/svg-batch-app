import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it } from "vitest";
import type { Project } from "./project/projectSchema";
import { initialPanelWeights, useAppStore } from "./store";

function project(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    projectId: "project-1",
    name: "Badges",
    mappings: [],
    assets: [],
    exportSettings: {
      format: "svg",
      includeCsv: false,
      filenameTemplate: "row-{row}",
      collisionPolicy: "suffix",
      continueOnError: false,
    },
    sources: [],
    audit: {
      createdAt: "2026-07-31T08:00:00.000Z",
      updatedAt: "2026-07-31T08:00:00.000Z",
      appVersion: "0.0.0",
    },
    ...overrides,
  };
}

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      mappings: [],
      project: null,
      selection: {
        activeRowId: null,
        selectedRowIds: [],
        svgObjectId: null,
      },
      sources: { spreadsheet: null, svg: null },
      ui: { panelWeights: initialPanelWeights },
    });
  });

  it("starts with empty project, source, and selection slices and default UI weights", () => {
    const state = useAppStore.getState();

    expect(state.mappings).toEqual([]);
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

  it("loads an empty validated project without changing UI state", () => {
    const stateBefore = useAppStore.getState();
    const loadedProject = project();

    stateBefore.setProject(loadedProject);

    const stateAfter = useAppStore.getState();
    expect(stateAfter.project).toEqual(loadedProject);
    expect(stateAfter.ui).toBe(stateBefore.ui);
    expect(stateAfter.sources).toEqual({ spreadsheet: null, svg: null });
    expect(stateAfter.selection).toEqual(stateBefore.selection);
    expect(stateAfter.mappings).toEqual([]);
  });

  it("hydrates persisted data, SVG, mappings, and selections", () => {
    useAppStore.getState().setProject(
      project({
        template: {
          fileName: "badge.svg",
          fileSize: 128,
          acceptedSvg:
            '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Template</text></svg>',
          sourceStatus: "embedded",
          selectedObjectId: "name",
        },
        data: {
          fileName: "members.csv",
          fileSize: 42,
          sheetNames: ["Members"],
          selectedSheetName: "Members",
          worksheets: {
            Members: {
              data: {
                columns: [
                  {
                    id: "member-name",
                    sourceHeader: "Name",
                    displayName: "Name",
                    sourceIndex: 0,
                    inferredType: "text",
                  },
                ],
                rows: [
                  {
                    id: "member-1",
                    values: { "member-name": "Ada" },
                    displayedValues: { "member-name": "Ada" },
                  },
                ],
              },
              selectedRowIds: ["member-1"],
              filters: [],
              rowOverrides: [],
              manualRows: [],
              columnPreferences: {
                visible: ["member-name"],
                exported: ["member-name"],
              },
            },
          },
        },
        mappings: [
          {
            id: "mapping-name",
            targetId: "name",
            columnId: "member-name",
            type: "text",
            fit: "keep",
          },
        ],
      }),
    );

    const state = useAppStore.getState();
    expect(state.mappings).toHaveLength(1);
    expect(state.sources.svg).toMatchObject({
      fileName: "badge.svg",
      targets: [{ id: "name", tagName: "text" }],
    });
    expect(state.sources.spreadsheet?.data.rows[0].id).toBe("member-1");
    expect(state.selection).toEqual({
      activeRowId: "member-1",
      selectedRowIds: ["member-1"],
      svgObjectId: "name",
    });
  });

  it("stores an accepted SVG without changing unrelated state", () => {
    useAppStore.getState().setSvgObjectSelection("old-target");
    useAppStore.getState().setMapping({
      id: "mapping-old-target",
      targetId: "old-target",
      columnId: "col-0",
      type: "text",
      fit: "keep",
    });
    const stateBefore = useAppStore.getState();
    const svg = {
      fileName: "badge.svg",
      fileSize: 123,
      acceptedSvg: '<svg xmlns="http://www.w3.org/2000/svg" />',
      sourceStatus: "embedded" as const,
      targets: [{ id: "badge", tagName: "g" }],
      tree: [
        {
          id: "badge",
          label: "Badge",
          tagName: "g",
          children: [],
        },
      ],
    };

    stateBefore.setSvgSource(svg);

    const stateAfter = useAppStore.getState();
    expect(stateAfter.sources.svg).toEqual(svg);
    expect(stateAfter.mappings).toEqual([]);
    expect(stateAfter.sources.spreadsheet).toBe(
      stateBefore.sources.spreadsheet,
    );
    expect(stateAfter.project).toBe(stateBefore.project);
    expect(stateAfter.selection).toEqual({
      ...stateBefore.selection,
      svgObjectId: null,
    });
    expect(stateAfter.ui).toBe(stateBefore.ui);

    stateAfter.setSvgObjectSelection("badge");
    expect(useAppStore.getState().selection.svgObjectId).toBe("badge");
  });

  it("adds, replaces, and removes one mapping per SVG target", () => {
    const store = useAppStore.getState();
    const sourcesBefore = store.sources;
    const selectionBefore = store.selection;

    store.setMapping({
      id: "mapping-name",
      targetId: "name",
      columnId: "col-0",
      type: "text",
      fit: "keep",
    });
    useAppStore.getState().setMapping({
      id: "mapping-photo",
      targetId: "photo",
      columnId: "col-1",
      type: "image",
      fit: "contain",
      emptyBehavior: "error",
    });
    useAppStore.getState().setMapping({
      id: "mapping-name",
      targetId: "name",
      columnId: "col-2",
      type: "text",
      fit: "truncate",
      required: true,
    });

    expect(useAppStore.getState().mappings).toEqual([
      {
        id: "mapping-name",
        targetId: "name",
        columnId: "col-2",
        type: "text",
        fit: "truncate",
        required: true,
      },
      {
        id: "mapping-photo",
        targetId: "photo",
        columnId: "col-1",
        type: "image",
        fit: "contain",
        emptyBehavior: "error",
      },
    ]);
    expect(useAppStore.getState().sources).toBe(sourcesBefore);
    expect(useAppStore.getState().selection).toBe(selectionBefore);

    useAppStore.getState().removeMapping("name");
    expect(
      useAppStore.getState().mappings.map((mapping) => mapping.targetId),
    ).toEqual(["photo"]);

    const stateBeforeMissingRemoval = useAppStore.getState();
    useAppStore.getState().removeMapping("missing");
    expect(useAppStore.getState().mappings).toEqual(
      stateBeforeMissingRemoval.mappings,
    );
  });

  it("stores every normalized worksheet and clears prior row selection", () => {
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
      columnFiltersBySheet: {},
      columnPreferencesBySheet: {
        Customers: { visible: [], exported: [] },
        "Mapping Guide": { visible: [], exported: [] },
      },
      data: { columns: [], rows: [] },
      manualRowsBySheet: {},
      normalizedDataBySheet: {
        Customers: { columns: [], rows: [] },
        "Mapping Guide": { columns: [], rows: [] },
      },
      rowOverridesBySheet: {},
      selectedRowIdsBySheet: {},
      selectedSheetName: "Customers",
    });
    expect(stateAfter.sources.svg).toBe(stateBefore.sources.svg);
    expect(stateAfter.project).toBe(stateBefore.project);
    expect(stateAfter.ui).toBe(stateBefore.ui);
    expect(stateAfter.selection).toEqual({
      ...stateBefore.selection,
      selectedRowIds: [],
    });
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
      activeRowId: "row-1",
      selectedRowIds: ["row-1"],
    });
    expect(stateAfterSelection.project).toBe(stateBefore.project);
    expect(stateAfterSelection.sources).toBe(stateBefore.sources);
    expect(stateAfterSelection.ui).toBe(stateBefore.ui);

    stateAfterSelection.toggleRowSelection("row-1");
    expect(useAppStore.getState().selection).toMatchObject({
      activeRowId: null,
      selectedRowIds: [],
    });
  });

  it("keeps the active preview row within the current row selection", () => {
    const store = useAppStore.getState();

    store.selectRows(["row-1", "row-2"]);
    expect(useAppStore.getState().selection.activeRowId).toBe("row-1");

    useAppStore.getState().setActiveRow("row-2");
    expect(useAppStore.getState().selection.activeRowId).toBe("row-2");

    useAppStore.getState().deselectRows(["row-2"]);
    expect(useAppStore.getState().selection.activeRowId).toBe("row-1");

    useAppStore.getState().setActiveRow("not-selected");
    expect(useAppStore.getState().selection.activeRowId).toBe("row-1");

    useAppStore.getState().clearRowSelection();
    expect(useAppStore.getState().selection.activeRowId).toBeNull();
  });

  it("reconciles the active preview row when switching worksheets", () => {
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
    useAppStore.getState().selectRows([memberRowId]);
    useAppStore.getState().setSelectedWorksheet("Plans");
    expect(useAppStore.getState().selection).toMatchObject({
      activeRowId: null,
      selectedRowIds: [],
    });

    const planRowId =
      useAppStore.getState().sources.spreadsheet?.data.rows[0].id ?? "";
    useAppStore.getState().selectRows([planRowId]);
    useAppStore.getState().setSelectedWorksheet("Members");
    expect(useAppStore.getState().selection).toMatchObject({
      activeRowId: memberRowId,
      selectedRowIds: [memberRowId],
    });
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
      Plans: {
        visible: ["col-0"],
        exported: ["col-0"],
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

  it("persists and restores every worksheet's data workflow state", () => {
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
    useAppStore.getState().setProject(project());
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 123,
      sheetNames: workbook.SheetNames,
      workbook,
    });

    const memberRowId =
      useAppStore.getState().sources.spreadsheet?.data.rows[0].id ?? "";
    useAppStore.getState().setColumnFilters([
      {
        type: "text",
        columnId: "col-1",
        operator: "equals",
        value: "London",
      },
    ]);
    useAppStore
      .getState()
      .setManualRows([
        { id: "manual-member", values: { "col-0": "Grace", "col-1": null } },
      ]);
    useAppStore
      .getState()
      .setRowOverrides([
        { rowId: memberRowId, values: { "col-0": "Augusta" } },
      ]);
    useAppStore.getState().setColumnPreferences({
      visible: ["col-0"],
      exported: ["col-1"],
    });
    useAppStore.getState().selectRows([memberRowId, "manual-member"]);
    useAppStore.getState().setSelectedWorksheet("Plans");

    const persistedProject = useAppStore.getState().project;
    expect(persistedProject?.data?.worksheets.Members.selectedRowIds).toEqual([
      memberRowId,
      "manual-member",
    ]);
    expect(persistedProject?.data?.selectedSheetName).toBe("Plans");

    useAppStore.setState({
      mappings: [],
      project: null,
      selection: {
        activeRowId: null,
        selectedRowIds: [],
        svgObjectId: null,
      },
      sources: { spreadsheet: null, svg: null },
    });
    useAppStore.getState().setProject(persistedProject!);

    const restored = useAppStore.getState().sources.spreadsheet;
    expect(restored?.workbook).toBeUndefined();
    expect(restored?.selectedSheetName).toBe("Plans");
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([]);

    useAppStore.getState().setSelectedWorksheet("Members");
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      memberRowId,
      "manual-member",
    ]);
    expect(restored?.normalizedDataBySheet.Members.rows[0].id).toBe(memberRowId);
    expect(restored?.columnFiltersBySheet.Members).toEqual([
      {
        type: "text",
        columnId: "col-1",
        operator: "equals",
        value: "London",
      },
    ]);
    expect(restored?.manualRowsBySheet.Members).toEqual([
      { id: "manual-member", values: { "col-0": "Grace", "col-1": null } },
    ]);
    expect(restored?.rowOverridesBySheet.Members).toEqual([
      { rowId: memberRowId, values: { "col-0": "Augusta" } },
    ]);
    expect(restored?.columnPreferencesBySheet.Members).toEqual({
      visible: ["col-0"],
      exported: ["col-1"],
    });
  });
});
