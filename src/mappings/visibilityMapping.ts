import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { VisibilityMapping } from "./schema";
import type { ValidationIssue } from "./validation";

function normalizedValue(value: string): string {
  return value.trim().toLowerCase();
}

export function applyVisibilityMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: VisibilityMapping,
): ValidationIssue[] {
  const sourceValue = row.displayedValues[mapping.columnId];
  if (sourceValue === undefined) {
    return [
      mappingIssue(
        row,
        mapping,
        "missing-column",
        "Mapped column is unavailable.",
      ),
    ];
  }

  const target = findElementById(svg, mapping.targetId);
  if (!target) {
    return [
      mappingIssue(
        row,
        mapping,
        "missing-target",
        "Mapped target is unavailable.",
      ),
    ];
  }

  const value = normalizedValue(sourceValue);
  if (value === "") {
    if (mapping.required || mapping.emptyBehavior === "error") {
      return [
        mappingIssue(
          row,
          mapping,
          mapping.required ? "required-value" : "empty-value",
          mapping.required
            ? "Required visibility value is blank."
            : "Visibility value is blank.",
        ),
      ];
    }

    if (mapping.emptyBehavior === "hide") {
      target.setAttribute("display", "none");
    } else {
      target.removeAttribute("display");
    }
    return [];
  }

  const trueValues = new Set(mapping.trueValues.map(normalizedValue));
  const falseValues = new Set(mapping.falseValues.map(normalizedValue));
  const isTrue = trueValues.has(value);
  const isFalse = falseValues.has(value);
  if (isTrue && isFalse) {
    return [
      mappingIssue(
        row,
        mapping,
        "ambiguous-value",
        "Visibility value matches both outcomes.",
      ),
    ];
  }
  if (!isTrue && !isFalse) {
    return [
      mappingIssue(
        row,
        mapping,
        "unknown-value",
        "Visibility value is not configured.",
      ),
    ];
  }

  if (isTrue) {
    target.removeAttribute("display");
  } else {
    target.setAttribute("display", "none");
  }
  return [];
}
