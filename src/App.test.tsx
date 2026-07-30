import { MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { initialPanelWeights, useAppStore } from "./store";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("App", () => {
  afterEach(cleanup);

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
    useAppStore.setState((state) => ({
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
});
