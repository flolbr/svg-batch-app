import type { ValidationIssue } from "../mappings/validation";
import type { ValidationPipelineResult } from "./validationPipeline";

export type ValidationIssueTypeGroup = {
  code: string;
  level: ValidationIssue["level"];
  issues: ValidationIssue[];
};

export type ValidationRowGroup = {
  rowId: string;
  issueTypes: ValidationIssueTypeGroup[];
};

export type ValidationReport = {
  totalIssues: number;
  counts: { error: number; warning: number; info: number };
  projectIssueTypes: ValidationIssueTypeGroup[];
  rows: ValidationRowGroup[];
};

function groupIssueTypes(
  issues: ValidationIssue[],
): ValidationIssueTypeGroup[] {
  const groups = new Map<string, ValidationIssueTypeGroup>();

  for (const issue of issues) {
    const key = `${issue.level}\u0000${issue.code}`;
    const group = groups.get(key);
    if (group) group.issues.push(issue);
    else {
      groups.set(key, {
        code: issue.code,
        level: issue.level,
        issues: [issue],
      });
    }
  }

  return [...groups.values()];
}

export function buildValidationReport(
  result: ValidationPipelineResult,
): ValidationReport {
  const counts = { error: 0, warning: 0, info: 0 };
  const projectIssues: ValidationIssue[] = [];
  const issuesByRow = new Map<string, ValidationIssue[]>();

  for (const issue of result.issues) {
    counts[issue.level] += 1;
    if (issue.rowId === undefined) {
      projectIssues.push(issue);
      continue;
    }

    const rowIssues = issuesByRow.get(issue.rowId) ?? [];
    rowIssues.push(issue);
    issuesByRow.set(issue.rowId, rowIssues);
  }

  const rows: ValidationRowGroup[] = [];
  const includedRowIds = new Set<string>();
  for (const row of result.rows) {
    const issues = issuesByRow.get(row.rowId);
    if (!issues) continue;
    rows.push({ rowId: row.rowId, issueTypes: groupIssueTypes(issues) });
    includedRowIds.add(row.rowId);
  }

  for (const [rowId, issues] of issuesByRow) {
    if (includedRowIds.has(rowId)) continue;
    rows.push({ rowId, issueTypes: groupIssueTypes(issues) });
  }

  return {
    totalIssues: result.issues.length,
    counts,
    projectIssueTypes: groupIssueTypes(projectIssues),
    rows,
  };
}
