import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
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
  });
});
