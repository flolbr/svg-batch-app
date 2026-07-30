import { MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, ROW_VIRTUALIZATION_THRESHOLD } from "./App";
import { initialPanelWeights, useAppStore } from "./store";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setSpreadsheetRows(rowCount: number) {
  useAppStore.getState().setSpreadsheetSource({
    fileName: "many-members.xlsx",
    fileSize: 1,
    sheetNames: ["Members"],
    workbook: {
      SheetNames: ["Members"],
      Sheets: {
        Members: {
          "!ref": `A1:A${rowCount + 1}`,
          A1: { t: "s", v: "Name" },
          ...Object.fromEntries(
            Array.from({ length: rowCount }, (_, index) => [
              `A${index + 2}`,
              { t: "s", v: `Member ${index + 1}` },
            ]),
          ),
        },
      },
    },
  });
}

function setMemberSpreadsheet() {
  useAppStore.getState().setSpreadsheetSource({
    fileName: "members.xlsx",
    fileSize: 1,
    sheetNames: ["Members"],
    workbook: {
      SheetNames: ["Members"],
      Sheets: {
        Members: {
          "!ref": "A1:B3",
          A1: { t: "s", v: "Name" },
          B1: { t: "s", v: "City" },
          A2: { t: "s", v: "Chloé Petit" },
          B2: { t: "s", v: "Paris" },
          A3: { t: "s", v: "Alice Martin" },
          B3: { t: "s", v: "Lyon" },
        },
      },
    },
  });
}

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value() {},
      writable: true,
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains("data-table-scroll-virtual") ? 400 : 0;
      },
    );
    useAppStore.setState((state) => ({
      mappings: [],
      project: null,
      selection: {
        activeRowId: null,
        selectedRowIds: [],
        svgObjectId: null,
      },
      sources: { spreadsheet: null, svg: null },
      ui: { ...state.ui, panelWeights: initialPanelWeights },
    }));
  });

  it("renders the three-panel application shell and project actions", () => {
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const appHeader = screen.getByRole("banner");
    expect(appHeader).toContainElement(
      screen.getByRole("heading", { name: "SVG Batch Generator" }),
    );

    expect(screen.getByRole("heading", { name: "Data" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "SVG Objects" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Preview" }),
    ).toBeInTheDocument();

    const projectActions = screen.getByRole("region", {
      name: "Project actions",
    });

    expect(
      screen.getByRole("button", { name: "Validate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save project" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Export selected" }),
    ).toBeInTheDocument();
    expect(projectActions).toContainElement(
      screen.getByRole("button", { name: "Validate" }),
    );
    expect(projectActions).toContainElement(
      screen.getByRole("button", { name: "Save project" }),
    );
    expect(projectActions).toContainElement(
      screen.getByRole("button", { name: "Export selected" }),
    );

    const workspace = screen.getByRole("main", {
      name: "SVG batch workspace",
    });
    const dataAndObjectsResizer = screen.getByRole("separator", {
      name: "Resize Data and SVG Objects panels",
    });
    const objectsAndPreviewResizer = screen.getByRole("separator", {
      name: "Resize SVG Objects and Preview panels",
    });

    expect(
      screen.getAllByRole("separator", { hidden: true }),
    ).toHaveLength(2);
    expect(dataAndObjectsResizer).toHaveAttribute("tabindex", "0");
    expect(objectsAndPreviewResizer).toHaveAttribute("tabindex", "0");

    const initialDataPanelWidth = workspace.style.getPropertyValue(
      "--data-panel-width",
    );
    fireEvent.keyDown(dataAndObjectsResizer, { key: "ArrowRight" });
    expect(workspace.style.getPropertyValue("--data-panel-width")).not.toBe(
      initialDataPanelWidth,
    );
  });

  it("imports and reports a sanitized local SVG", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const fit = screen.getByRole("button", { name: "Fit" });
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).toBeDisabled();
    expect(fit).toBeDisabled();

    await user.upload(
      screen.getByLabelText("Choose an SVG file"),
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg"><g id="badge"><text>Hello</text></g></svg>',
        ],
        "badge.svg",
        { type: "image/svg+xml" },
      ),
    );

    await waitFor(() => {
      expect(useAppStore.getState().sources.svg?.fileName).toBe("badge.svg");
    });
    expect(screen.getByText("Sanitized")).toBeInTheDocument();
    expect(
      screen.getByLabelText("SVG source status: Embedded"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 mapping target found")).toBeInTheDocument();
    expect(zoomOut).toBeEnabled();
    expect(zoomIn).toBeEnabled();
    expect(fit).toBeDisabled();
    const preview = screen.getByTitle("SVG preview");
    expect(preview).toHaveAttribute("sandbox", "");
    expect(preview.getAttribute("srcdoc")).toContain('id="badge"');
    expect(document.querySelector("#badge")).not.toBeInTheDocument();
    expect(
      screen.getByRole("tree", { name: "SVG object tree" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("treeitem", { name: /badge/ }));
    expect(useAppStore.getState().selection.svgObjectId).toBe("badge");
    expect(screen.getByText("badge (g #badge)")).toBeInTheDocument();
    expect(
      screen.getByText(/Import or select spreadsheet data/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(preview.getAttribute("srcdoc")).toContain(
        'id="badge" data-svg-batch-highlight="true"',
      );
    });
    expect(useAppStore.getState().sources.svg?.acceptedSvg).not.toContain(
      "data-svg-batch-highlight",
    );

    for (let step = 0; step < 4; step += 1) {
      await user.click(zoomIn);
    }
    expect(screen.getByText("200%")).toBeInTheDocument();
    expect(zoomIn).toBeDisabled();
    expect(fit).toBeEnabled();

    await user.click(fit);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(fit).toBeDisabled();

    for (let step = 0; step < 3; step += 1) {
      await user.click(zoomOut);
    }
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(zoomOut).toBeDisabled();
    expect(useAppStore.getState().sources.svg?.acceptedSvg).not.toContain(
      "transform:scale",
    );

    await user.type(
      screen.getByRole("textbox", { name: "Search SVG objects" }),
      "missing",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No SVG objects match",
    );
    expect(
      screen.getByRole("textbox", { name: "Search SVG objects" }),
    ).toBeEnabled();
  });

  it("configures and removes a mapping for the selected SVG object", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    useAppStore.getState().setSvgSource({
      acceptedSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><text id="member-name">Name</text></svg>',
      fileName: "badge.svg",
      fileSize: 1,
      sourceStatus: "embedded",
      targets: [{ id: "member-name", tagName: "text" }],
      tree: [
        {
          children: [],
          id: "member-name",
          label: "Member name",
          tagName: "text",
        },
      ],
    });
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("treeitem", { name: /Member name/ }));
    await user.click(screen.getByRole("combobox", { name: "Mapping type" }));
    fireEvent.click(screen.getByRole("option", { name: "Text", hidden: true }));

    expect(useAppStore.getState().mappings).toEqual([
      {
        id: "mapping-member-name",
        targetId: "member-name",
        columnId: "col-0",
        type: "text",
        fit: "keep",
        required: undefined,
      },
    ]);
    expect(screen.getByText("Mapping configured.")).toBeInTheDocument();

    await user.click(
      screen.getByRole("combobox", { name: "Spreadsheet column" }),
    );
    const cityMappingOption = screen
      .getAllByRole("option", { name: "City", hidden: true })
      .find((option) => option.hasAttribute("data-combobox-option"));
    expect(cityMappingOption).toBeDefined();
    fireEvent.click(cityMappingOption!);
    expect(useAppStore.getState().mappings[0].columnId).toBe("col-1");

    await user.click(screen.getByRole("button", { name: "Remove mapping" }));
    expect(useAppStore.getState().mappings).toEqual([]);
    expect(
      screen.queryByRole("button", { name: "Remove mapping" }),
    ).not.toBeInTheDocument();
  });

  it("shows every SVG source status without enabling future adapters", () => {
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.getByLabelText("SVG source status: Unavailable"),
    ).toBeInTheDocument();

    const statuses = [
      ["embedded", "Embedded"],
      ["linked", "Linked"],
      ["drive", "Drive"],
      ["unavailable", "Unavailable"],
      ["modified", "Modified"],
    ] as const;
    statuses.forEach(([sourceStatus, label]) => {
      act(() => {
        useAppStore.getState().setSvgSource({
          acceptedSvg:
            '<svg xmlns="http://www.w3.org/2000/svg"><g id="badge"/></svg>',
          fileName: "badge.svg",
          fileSize: 1,
          sourceStatus,
          targets: [{ id: "badge", tagName: "g" }],
          tree: [
            {
              children: [],
              id: "badge",
              label: "Badge",
              tagName: "g",
            },
          ],
        });
      });
      expect(
        screen.getByLabelText(`SVG source status: ${label}`),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Open from Google Drive" }),
    ).toBeDisabled();
  });

  it("imports a local spreadsheet and reports the available worksheets", async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.upload(
      screen.getByLabelText("Choose a CSV, XLSX, or XLS file"),
      new File(["Name,City\nAlice,Paris"], "customers.csv", {
        type: "text/csv",
      }),
    );

    expect(
      await screen.findByText("customers.csv · 1 worksheet"),
    ).toBeInTheDocument();
    expect(useAppStore.getState().sources.spreadsheet?.sheetNames).toEqual([
      "Sheet1",
    ]);
    expect(useAppStore.getState().sources.spreadsheet?.selectedSheetName).toBe(
      "Sheet1",
    );
    expect(
      screen.getByRole("combobox", { name: "Worksheet" }),
    ).toBeDisabled();
  });

  it("lets the user choose an imported worksheet", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setSpreadsheetSource({
      fileName: "customers.xlsx",
      fileSize: 1,
      sheetNames: ["Customers", "Mapping Guide"],
      workbook: {
        SheetNames: ["Customers", "Mapping Guide"],
        Sheets: {},
      },
    });

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const worksheet = screen.getByRole("combobox", { name: "Worksheet" });
    expect(worksheet).toHaveValue("Customers");
    expect(worksheet).toBeEnabled();

    await user.click(worksheet);
    await user.click(
      screen.getByRole("option", { hidden: true, name: "Mapping Guide" }),
    );

    expect(useAppStore.getState().sources.spreadsheet?.selectedSheetName).toBe(
      "Mapping Guide",
    );
  });

  it("renders normalized headers and displayed worksheet values in the grid", () => {
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 1,
      sheetNames: ["Members"],
      workbook: {
        SheetNames: ["Members"],
        Sheets: {
          Members: {
            "!ref": "A1:B2",
            A1: { t: "s", v: "Name" },
            B1: { t: "s", v: "Member ID" },
            A2: { t: "s", v: "Alice" },
            B2: { t: "n", v: 123, w: "00123" },
          },
        },
      },
    });

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Member ID" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "00123" })).toBeInTheDocument();
  });

  it("renders stable duplicate display headers", () => {
    useAppStore.getState().setSpreadsheetSource({
      fileName: "duplicate-headers.xlsx",
      fileSize: 1,
      sheetNames: ["Members"],
      workbook: {
        SheetNames: ["Members"],
        Sheets: {
          Members: {
            "!ref": "A1:B2",
            A1: { t: "s", v: "Name" },
            B1: { t: "s", v: "Name" },
            A2: { t: "s", v: "Alice" },
            B2: { t: "s", v: "Ally" },
          },
        },
      },
    });

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name (2)" }),
    ).toBeInTheDocument();
  });

  it("updates grid headers and values when the worksheet changes", async () => {
    const user = userEvent.setup();
    useAppStore.getState().setSpreadsheetSource({
      fileName: "members.xlsx",
      fileSize: 1,
      sheetNames: ["Members", "Plans"],
      workbook: {
        SheetNames: ["Members", "Plans"],
        Sheets: {
          Members: {
            "!ref": "A1:A2",
            A1: { t: "s", v: "Name" },
            A2: { t: "s", v: "Alice" },
          },
          Plans: {
            "!ref": "A1:A2",
            A1: { t: "s", v: "Plan" },
            A2: { t: "s", v: "Premium" },
          },
        },
      },
    });

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Worksheet" }));
    await user.click(
      screen.getByRole("option", { hidden: true, name: "Plans" }),
    );

    expect(
      screen.getByRole("columnheader", { name: "Plan" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Premium" })).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Alice" }),
    ).not.toBeInTheDocument();
  });

  it("searches displayed values across all or one selected column", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const search = screen.getByRole("textbox", {
      name: "Search imported values",
    });
    const columnScope = screen.getByRole("combobox", {
      name: "Search columns",
    });

    expect(columnScope).toHaveValue("all");
    expect(screen.getByRole("option", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "City" })).toBeInTheDocument();

    await user.type(search, "shloe pari");

    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("cell", { name: "Chloé Petit" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 matching · 2 total rows")).toBeInTheDocument();

    await user.selectOptions(columnScope, "col-0");
    expect(
      await screen.findByText("No rows match your search."),
    ).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "shloe");
    expect(
      await screen.findByRole("cell", { name: "Chloé Petit" }),
    ).toBeInTheDocument();

    await user.selectOptions(columnScope, "col-1");
    expect(
      await screen.findByText("No rows match your search."),
    ).toBeInTheDocument();
  });

  it("applies and removes distinct-value column filters after search", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(
      await screen.findByRole("combobox", { name: "Filter column" }),
    );
    const cityOption = screen
      .getAllByRole("option", { hidden: true, name: "City" })
      .find((option) => option.tagName === "DIV");
    expect(cityOption).toBeDefined();
    await user.click(cityOption!);
    await user.click(
      screen.getByRole("checkbox", { hidden: true, name: "Lyon" }),
    );
    await user.click(
      screen.getByRole("button", { hidden: true, name: "Apply filter" }),
    );

    expect(
      screen.getByRole("cell", { name: "Chloé Petit" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Alice Martin" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 matching · 2 total rows")).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "alice",
    );
    expect(
      await screen.findByText("No rows match your search and filters."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters (1)" }));
    await user.click(
      await screen.findByRole("button", {
        hidden: true,
        name: "Remove City filter",
      }),
    );

    expect(
      await screen.findByRole("cell", { name: "Alice Martin" }),
    ).toBeInTheDocument();
  });

  it("keeps selected rows selected while a filter hides them", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    const aliceRowId = useAppStore
      .getState()
      .sources.spreadsheet?.data.rows.find(
        (row) => row.displayedValues["col-0"] === "Alice Martin",
      )?.id;

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("checkbox", { name: "Select row 2" }));
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      aliceRowId,
    ]);
    expect(
      screen.getByText("1 row selected · Not validated"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters" }));
    await user.click(
      await screen.findByRole("combobox", { name: "Filter column" }),
    );
    const cityOption = screen
      .getAllByRole("option", { hidden: true, name: "City" })
      .find((option) => option.tagName === "DIV");
    expect(cityOption).toBeDefined();
    await user.click(cityOption!);
    await user.click(
      screen.getByRole("checkbox", { hidden: true, name: "Lyon" }),
    );
    await user.click(
      screen.getByRole("button", { hidden: true, name: "Apply filter" }),
    );

    expect(
      screen.queryByRole("cell", { name: "Alice Martin" }),
    ).not.toBeInTheDocument();
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      aliceRowId,
    ]);
    expect(
      screen.getByText("1 row selected · Not validated"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters (1)" }));
    await user.click(
      await screen.findByRole("button", {
        hidden: true,
        name: "Remove City filter",
      }),
    );

    expect(
      await screen.findByRole("checkbox", { name: "Select row 2" }),
    ).toBeChecked();
  });

  it("navigates all selected rows even when filtering hides the active row", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    const sourceRowIds =
      useAppStore
        .getState()
        .sources.spreadsheet?.data.rows.map((row) => row.id) ?? [];

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
    expect(previous).toBeDisabled();
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Select row 2" }));
    await user.click(screen.getByRole("checkbox", { name: "Select row 1" }));

    expect(useAppStore.getState().selection.activeRowId).toBe(sourceRowIds[1]);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(useAppStore.getState().selection.activeRowId).toBe(sourceRowIds[0]);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(next);

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "chloe",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    await user.click(previous);
    expect(useAppStore.getState().selection.activeRowId).toBe(sourceRowIds[0]);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("selects matching and visible rows and clears selection", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    const sourceRowIds =
      useAppStore
        .getState()
        .sources.spreadsheet?.data.rows.map((row) => row.id) ?? [];

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const headerCheckbox = screen.getByRole("checkbox", {
      name: "Toggle visible page selection",
    });
    expect(headerCheckbox).not.toBeChecked();

    await user.click(
      screen.getByRole("button", { name: "Select visible page" }),
    );
    expect(useAppStore.getState().selection.selectedRowIds).toEqual(
      sourceRowIds,
    );
    expect(headerCheckbox).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(headerCheckbox).toBePartiallyChecked();

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "chloe",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("cell", { name: "Chloé Petit" }),
    ).toBeInTheDocument();
    expect(headerCheckbox).not.toBeChecked();

    await user.click(
      screen.getByRole("button", { name: "Select all matching" }),
    );
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([
      sourceRowIds[1],
      sourceRowIds[0],
    ]);
    expect(headerCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(useAppStore.getState().selection.selectedRowIds).toEqual([]);
    expect(headerCheckbox).not.toBeChecked();
    expect(
      screen.getByText("0 rows selected · Not validated"),
    ).toBeInTheDocument();
  });

  it("adds and edits manual rows with keyboard controls", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    const sourceRows = useAppStore.getState().sources.spreadsheet?.data.rows;

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add row" }));
    const nameInput = screen.getByRole("textbox", {
      name: "Name for manual row 1",
    });
    const cityInput = screen.getByRole("textbox", {
      name: "City for manual row 1",
    });
    expect(nameInput).toHaveFocus();

    await user.type(nameInput, "Zoë Laurent");
    await user.tab();
    expect(cityInput).toHaveFocus();
    await user.type(cityInput, "Berlin");
    await user.keyboard("{Enter}");
    expect(cityInput).not.toHaveFocus();

    const manualRows =
      useAppStore.getState().sources.spreadsheet?.manualRowsBySheet.Members;
    expect(manualRows).toHaveLength(1);
    expect(manualRows?.[0].values).toEqual({
      "col-0": "Zoë Laurent",
      "col-1": "Berlin",
    });
    expect(useAppStore.getState().sources.spreadsheet?.data.rows).toBe(
      sourceRows,
    );
    expect(screen.getByText("3 total rows")).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "zoe",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("textbox", { name: "Name for manual row 1" }),
    ).toHaveValue("Zoë Laurent");
    expect(screen.getByText("1 matching · 3 total rows")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add row" }));
    expect(
      screen.getByRole("textbox", { name: "Search imported values" }),
    ).toHaveValue("");
    expect(
      await screen.findByRole("textbox", { name: "Name for manual row 2" }),
    ).toHaveFocus();
  });

  it("pastes, duplicates, and deletes manual rows", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Add row" }));
    const nameInput = screen.getByRole("textbox", {
      name: "Name for manual row 1",
    });
    await user.click(nameInput);
    await user.paste("Mina\tRome\nNoah\tOslo");

    expect(
      await screen.findByRole("textbox", { name: "Name for manual row 2" }),
    ).toHaveValue("Noah");
    expect(
      screen.getByRole("textbox", { name: "City for manual row 2" }),
    ).toHaveValue("Oslo");

    await user.click(
      screen.getByRole("button", { name: "Duplicate manual row 1" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Name for manual row 2" }),
    ).toHaveValue("Mina");
    expect(
      screen.getByRole("textbox", { name: "Name for manual row 3" }),
    ).toHaveValue("Noah");

    const duplicatedRowId =
      useAppStore.getState().sources.spreadsheet?.manualRowsBySheet.Members[1]
        .id;
    await user.click(screen.getByRole("checkbox", { name: "Select row 4" }));
    expect(useAppStore.getState().selection.selectedRowIds).toContain(
      duplicatedRowId,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete manual row 2" }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Name for manual row 3" }),
    ).not.toBeInTheDocument();
    expect(
      useAppStore.getState().sources.spreadsheet?.manualRowsBySheet.Members,
    ).toHaveLength(2);
    expect(useAppStore.getState().selection.selectedRowIds).not.toContain(
      duplicatedRowId,
    );
  });

  it("edits imported rows through overrides and can reset them", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();
    const sourceRows = useAppStore.getState().sources.spreadsheet?.data.rows;
    const sourceRowId = sourceRows?.[0].id;

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "chloe",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: "Edit imported row 1" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Search imported values" }),
    ).toHaveValue("");
    const nameInput = screen.getByRole("textbox", {
      name: "Name for imported row 1",
    });
    const cityInput = screen.getByRole("textbox", {
      name: "City for imported row 1",
    });
    expect(nameInput).toHaveFocus();

    await user.clear(nameInput);
    await user.type(nameInput, "Renée Durand");
    await user.tab();
    expect(cityInput).toHaveFocus();
    await user.clear(cityInput);
    await user.type(cityInput, "Berlin");
    await user.keyboard("{Enter}");

    expect(
      screen.queryByRole("textbox", { name: "Name for imported row 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Renée Durand" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Berlin" })).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(
      useAppStore.getState().sources.spreadsheet?.rowOverridesBySheet.Members,
    ).toEqual([
      {
        rowId: sourceRowId,
        values: { "col-0": "Renée Durand", "col-1": "Berlin" },
      },
    ]);
    expect(useAppStore.getState().sources.spreadsheet?.data.rows).toBe(
      sourceRows,
    );
    expect(sourceRows?.[0].displayedValues).toEqual({
      "col-0": "Chloé Petit",
      "col-1": "Paris",
    });

    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "renee",
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Alice Martin" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("cell", { name: "Renée Durand" }),
    ).toBeInTheDocument();

    await user.clear(
      screen.getByRole("textbox", { name: "Search imported values" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Reset imported row 1" }),
    );
    expect(
      await screen.findByRole("cell", { name: "Chloé Petit" }),
    ).toBeInTheDocument();
    expect(
      useAppStore.getState().sources.spreadsheet?.rowOverridesBySheet.Members,
    ).toEqual([]);
  });

  it("keeps visible and exported columns independent while hidden columns remain searchable", async () => {
    const user = userEvent.setup();
    setMemberSpreadsheet();

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("columnheader", { name: "City" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Columns (2/2)" }));

    const showCity = await screen.findByRole("checkbox", {
      hidden: true,
      name: "Show City column",
    });
    const exportCity = screen.getByRole("checkbox", {
      hidden: true,
      name: "Export City column",
    });
    await user.click(showCity);
    expect(exportCity).toBeChecked();

    await user.click(
      screen.getByRole("checkbox", {
        hidden: true,
        name: "Export Name column",
      }),
    );
    expect(
      useAppStore.getState().sources.spreadsheet?.columnPreferencesBySheet
        .Members,
    ).toEqual({
      visible: ["col-0"],
      exported: ["col-1"],
    });
    expect(
      screen.queryByRole("columnheader", { name: "City" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Paris" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Columns (1/2)" }));
    const searchColumns = screen.getByRole("combobox", {
      name: "Search columns",
    });
    expect(screen.getByRole("option", { name: "City" })).toBeInTheDocument();
    await user.selectOptions(searchColumns, "col-1");
    await user.type(
      screen.getByRole("textbox", { name: "Search imported values" }),
      "lyon",
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("cell", { name: "Chloé Petit" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("cell", { name: "Alice Martin" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Lyon" }),
    ).not.toBeInTheDocument();
  });

  it("renders every row without a scroll region at the virtualization threshold", () => {
    setSpreadsheetRows(ROW_VIRTUALIZATION_THRESHOLD);

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    expect(
      screen.queryByRole("region", { name: "Spreadsheet rows" }),
    ).not.toBeInTheDocument();
    expect(document.querySelectorAll(".data-table tbody tr")).toHaveLength(
      ROW_VIRTUALIZATION_THRESHOLD,
    );
    expect(
      screen.getByRole("cell", {
        name: `Member ${ROW_VIRTUALIZATION_THRESHOLD}`,
      }),
    ).toBeInTheDocument();
  });

  it("virtualizes rows above the threshold while exposing the logical grid size", async () => {
    const user = userEvent.setup();
    const rowCount = ROW_VIRTUALIZATION_THRESHOLD + 1;
    setSpreadsheetRows(rowCount);

    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    );

    const rowsRegion = screen.getByRole("region", {
      name: "Spreadsheet rows",
    });
    rowsRegion.focus();

    expect(rowsRegion).toHaveFocus();
    expect(rowsRegion).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("table")).toHaveAttribute(
      "aria-rowcount",
      String(rowCount + 1),
    );
    expect(
      document.querySelectorAll(".data-table tbody tr[data-index]").length,
    ).toBeLessThan(
      rowCount / 2,
    );
    expect(
      await screen.findByRole("cell", { name: "Member 1" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Select visible page" }),
    );
    expect(
      useAppStore.getState().selection.selectedRowIds.length,
    ).toBeGreaterThan(0);
    expect(useAppStore.getState().selection.selectedRowIds.length).toBeLessThan(
      rowCount,
    );
    const firstVirtualRow = document.querySelector(
      ".data-table tbody tr[aria-rowindex]",
    );
    expect(firstVirtualRow).not.toBeNull();
    expect(firstVirtualRow).toHaveAttribute(
      "aria-rowindex",
      String(Number(firstVirtualRow?.getAttribute("data-index")) + 2),
    );

    Object.defineProperty(rowsRegion, "scrollTop", {
      configurable: true,
      value: (rowCount - 10) * 40,
      writable: true,
    });
    fireEvent.scroll(rowsRegion);

    expect(
      await screen.findByRole("cell", { name: `Member ${rowCount}` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("cell", { name: "Member 1" }),
    ).not.toBeInTheDocument();
  });
});
