import type { SourceRow } from "../data/normalizeWorkbook";
import {
  applyMappings,
  type ApplyMappingsOptions,
} from "../mappings/applyMappings";
import type { Mapping } from "../mappings/schema";
import type { ValidationIssue } from "../mappings/validation";

export type ValidatedRow = {
  rowId: string;
  svg: SVGSVGElement;
  issues: ValidationIssue[];
};

export type ValidationPipelineResult = {
  rows: ValidatedRow[];
  issues: ValidationIssue[];
  hasErrors: boolean;
};

export type ValidationPipelineInput = {
  template: SVGSVGElement;
  rows: readonly SourceRow[];
  mappings: readonly Mapping[];
  mappingOptions?: ApplyMappingsOptions;
};

export function validateRows({
  template,
  rows,
  mappings,
  mappingOptions,
}: ValidationPipelineInput): ValidationPipelineResult {
  const validatedRows = rows.map((row) => {
    const result = applyMappings(template, row, mappings, mappingOptions);
    return {
      rowId: row.id,
      svg: result.svg,
      issues: result.issues,
    };
  });
  const issues = validatedRows.flatMap((row) => row.issues);

  return {
    rows: validatedRows,
    issues,
    hasErrors: issues.some((issue) => issue.level === "error"),
  };
}
