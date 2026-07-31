import { describe, expect, it } from "vitest";
import type { ValidationIssue } from "../mappings/validation";
import type { ValidationPipelineResult } from "./validationPipeline";
import { buildValidationReport } from "./validationReport";

function issue(
  level: ValidationIssue["level"],
  code: string,
  message: string,
  rowId?: string,
): ValidationIssue {
  return { level, code, message, rowId };
}

function result(
  issues: ValidationIssue[],
  rowIds: string[] = [],
): ValidationPipelineResult {
  return {
    rows: rowIds.map((rowId) => ({
      rowId,
      svg: document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      issues: [],
    })),
    projectIssues: [],
    issues,
    hasErrors: issues.some((item) => item.level === "error"),
  };
}

describe("buildValidationReport", () => {
  it("returns an empty report", () => {
    expect(buildValidationReport(result([]))).toEqual({
      totalIssues: 0,
      counts: { error: 0, warning: 0, info: 0 },
      projectIssueTypes: [],
      rows: [],
    });
  });

  it("groups project and row issues while following pipeline row order", () => {
    const report = buildValidationReport(
      result(
        [
          issue("error", "missing-column", "Column unavailable."),
          issue("warning", "unknown-value", "Unknown value.", "row-1"),
          issue("error", "required-value", "Required value missing.", "row-2"),
          issue("info", "note", "Additional note.", "row-1"),
        ],
        ["row-2", "row-1"],
      ),
    );

    expect(report.counts).toEqual({ error: 2, warning: 1, info: 1 });
    expect(report.projectIssueTypes.map((group) => group.code)).toEqual([
      "missing-column",
    ]);
    expect(report.rows.map((row) => row.rowId)).toEqual(["row-2", "row-1"]);
    expect(report.rows[1].issueTypes.map((group) => group.code)).toEqual([
      "unknown-value",
      "note",
    ]);
  });

  it("combines same-code issues and preserves their messages", () => {
    const report = buildValidationReport(
      result(
        [
          issue("error", "duplicate-filename", "First.", "row-1"),
          issue("error", "duplicate-filename", "Second.", "row-1"),
        ],
        ["row-1"],
      ),
    );

    expect(report.rows[0].issueTypes).toEqual([
      {
        code: "duplicate-filename",
        level: "error",
        issues: [
          issue("error", "duplicate-filename", "First.", "row-1"),
          issue("error", "duplicate-filename", "Second.", "row-1"),
        ],
      },
    ]);
  });

  it("keeps equal codes at different levels in separate groups", () => {
    const report = buildValidationReport(
      result([
        issue("warning", "resource", "Warning."),
        issue("error", "resource", "Error."),
      ]),
    );

    expect(
      report.projectIssueTypes.map((group) => [group.level, group.code]),
    ).toEqual([
      ["warning", "resource"],
      ["error", "resource"],
    ]);
  });

  it("omits clean pipeline rows", () => {
    const report = buildValidationReport(
      result(
        [issue("error", "required-value", "Missing.", "row-2")],
        ["row-1", "row-2"],
      ),
    );

    expect(report.rows.map((row) => row.rowId)).toEqual(["row-2"]);
  });

  it("appends orphan row IDs in aggregate issue order", () => {
    const report = buildValidationReport(
      result(
        [
          issue("error", "first", "First.", "orphan-b"),
          issue("error", "second", "Second.", "row-1"),
          issue("error", "third", "Third.", "orphan-a"),
        ],
        ["row-1"],
      ),
    );

    expect(report.rows.map((row) => row.rowId)).toEqual([
      "row-1",
      "orphan-b",
      "orphan-a",
    ]);
  });
});
