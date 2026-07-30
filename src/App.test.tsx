import { MantineProvider } from "@mantine/core";
import userEvent from "@testing-library/user-event";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { initialPanelWeights, useAppStore } from "./store";

describe("App", () => {
  afterEach(cleanup);

  beforeEach(() => {
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
  });
});
