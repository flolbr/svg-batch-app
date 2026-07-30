import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { TextMapping } from "./schema";
import type { ValidationIssue } from "./validation";

export function applyTextMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: TextMapping,
): ValidationIssue[] {
  const value = row.displayedValues[mapping.columnId];
  if (value === undefined) {
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

  if (target.localName !== "text" && target.localName !== "tspan") {
    return [
      mappingIssue(
        row,
        mapping,
        "incompatible-target",
        "Text mapping requires a text or tspan target.",
      ),
    ];
  }

  if (mapping.required && value.trim() === "") {
    return [
      mappingIssue(
        row,
        mapping,
        "required-value",
        "Required text value is blank.",
      ),
    ];
  }

  target.textContent = value;
  return [];
}
