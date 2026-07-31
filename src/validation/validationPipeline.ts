import type { SourceRow } from "../data/normalizeWorkbook";
import {
  applyMappings,
  type ApplyMappingsOptions,
} from "../mappings/applyMappings";
import type { Mapping } from "../mappings/schema";
import type { ValidationIssue } from "../mappings/validation";
import {
  validateDuplicateFilenames,
  type RequestedFilename,
} from "./filenameValidation";
import {
  validateExternalResources,
  validateMappingConfiguration,
} from "./validationRules";

export type ValidatedRow = {
  rowId: string;
  svg: SVGSVGElement;
  issues: ValidationIssue[];
};

export type ValidationPipelineResult = {
  rows: ValidatedRow[];
  projectIssues: ValidationIssue[];
  issues: ValidationIssue[];
  hasErrors: boolean;
};

export type ValidationPipelineInput = {
  template: SVGSVGElement;
  rows: readonly SourceRow[];
  columnIds: ReadonlySet<string>;
  mappings: readonly Mapping[];
  mappingOptions?: ApplyMappingsOptions;
  requestedFilenames?: readonly RequestedFilename[];
};

export function validateRows({
  template,
  rows,
  columnIds,
  mappings,
  mappingOptions,
  requestedFilenames = [],
}: ValidationPipelineInput): ValidationPipelineResult {
  const configuration = validateMappingConfiguration(
    template,
    columnIds,
    mappings,
  );
  const filenameIssues = validateDuplicateFilenames(requestedFilenames);
  const filenameIssuesByRow = new Map<string, ValidationIssue[]>();

  for (const issue of filenameIssues) {
    if (!issue.rowId) continue;
    const rowIssues = filenameIssuesByRow.get(issue.rowId) ?? [];
    rowIssues.push(issue);
    filenameIssuesByRow.set(issue.rowId, rowIssues);
  }

  const validatedRows = rows.map((row) => {
    const result = applyMappings(
      template,
      row,
      configuration.applicableMappings,
      mappingOptions,
    );
    return {
      rowId: row.id,
      svg: result.svg,
      issues: [
        ...result.issues,
        ...validateExternalResources(result.svg, row.id),
        ...(filenameIssuesByRow.get(row.id) ?? []),
      ],
    };
  });
  const rowIds = new Set(rows.map((row) => row.id));
  const issues = [
    ...configuration.issues,
    ...validatedRows.flatMap((row) => row.issues),
    ...filenameIssues.filter(
      (issue) => issue.rowId && !rowIds.has(issue.rowId),
    ),
  ];

  return {
    rows: validatedRows,
    projectIssues: configuration.issues,
    issues,
    hasErrors: issues.some((issue) => issue.level === "error"),
  };
}
