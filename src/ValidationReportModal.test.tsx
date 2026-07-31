import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ValidationReportModal } from "./ValidationReportModal";
import type { ValidationIssue } from "./mappings/validation";
import type { ValidationPipelineResult } from "./validation/validationPipeline";

function svg(): SVGSVGElement {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

function result(issues: ValidationIssue[]): ValidationPipelineResult {
  return {
    rows: [
      { rowId: "row-1", svg: svg(), issues: [] },
      { rowId: "row-2", svg: svg(), issues: [] },
    ],
    projectIssues: [],
    issues,
    hasErrors: issues.some((issue) => issue.level === "error"),
  };
}

function renderModal(
  validationResult: ValidationPipelineResult | null,
  onClose = vi.fn(),
) {
  render(
    <MantineProvider>
      <ValidationReportModal
        opened
        onClose={onClose}
        result={validationResult}
        rowLabels={new Map([["row-1", "Ada Lovelace"]])}
      />
    </MantineProvider>,
  );
  return onClose;
}

afterEach(() => {
  cleanup();
  document
    .querySelectorAll("[data-mantine-shared-portal-node]")
    .forEach((node) => node.remove());
});

describe("ValidationReportModal", () => {
  it("shows a success state for an empty result", () => {
    renderModal(result([]));

    expect(screen.getByRole("status")).toHaveTextContent(
      "No validation issues found.",
    );
  });

  it("shows grouped project and row issues with severity counts", () => {
    renderModal(
      result([
        {
          level: "error",
          code: "missing-target",
          message: "Mapped target is unavailable.",
        },
        {
          level: "error",
          code: "duplicate-filename",
          message: "Same filename.",
          rowId: "row-1",
        },
        {
          level: "error",
          code: "duplicate-filename",
          message: "Same filename.",
          rowId: "row-1",
        },
        {
          level: "warning",
          code: "unknown-value",
          message: "Unknown value.",
          rowId: "row-2",
        },
      ]),
    );

    expect(screen.getByRole("status")).toHaveTextContent("4 issues found");
    expect(screen.getByRole("status")).toHaveTextContent("3 error");
    expect(screen.getByRole("status")).toHaveTextContent("1 warning");
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Missing Target")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace · 2 issues")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Filename")).toBeInTheDocument();
    expect(screen.getByText("Same filename. ×2")).toBeInTheDocument();
    expect(screen.getByText("Unknown Value")).toBeInTheDocument();
  });

  it("calls onClose from the modal close button", () => {
    const onClose = renderModal(result([]));

    fireEvent.click(
      screen.getByRole("button", { name: "Close validation report" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
