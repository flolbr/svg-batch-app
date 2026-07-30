import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { GroupMapping } from "./schema";
import type { ValidationIssue } from "./validation";

function candidateChildren(
  target: Element,
  match: GroupMapping["match"],
): Element[] {
  return Array.from(target.children).filter((child) =>
    match === "id"
      ? child.hasAttribute("id")
      : child.hasAttribute("data-option") || child.hasAttribute("id"),
  );
}

function hideChildren(children: Element[]): void {
  children.forEach((child) => child.setAttribute("display", "none"));
}

export function applyGroupMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: GroupMapping,
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
  if (target.localName !== "g") {
    return [
      mappingIssue(
        row,
        mapping,
        "incompatible-target",
        "Group mapping requires a g target.",
      ),
    ];
  }

  const candidates = candidateChildren(target, mapping.match);
  const value = sourceValue.trim();
  if (value === "") {
    if (mapping.required || mapping.emptyBehavior === "error") {
      return [
        mappingIssue(
          row,
          mapping,
          mapping.required ? "required-value" : "empty-value",
          mapping.required
            ? "Required group value is blank."
            : "Group value is blank.",
        ),
      ];
    }
    if (mapping.emptyBehavior === "hide-all") hideChildren(candidates);
    return [];
  }

  let selected: Element | undefined;
  if (mapping.match === "data-option") {
    const optionMatches = candidates.filter(
      (child) => child.getAttribute("data-option")?.trim() === value,
    );
    if (optionMatches.length > 1) {
      return [
        mappingIssue(
          row,
          mapping,
          "ambiguous-value",
          "Group value matches multiple options.",
        ),
      ];
    }
    selected =
      optionMatches[0] ??
      candidates.find((child) => child.getAttribute("id") === value);
  } else {
    selected = candidates.find((child) => child.getAttribute("id") === value);
  }

  if (!selected) {
    return [
      mappingIssue(
        row,
        mapping,
        "unknown-value",
        "Group value is not configured.",
      ),
    ];
  }

  candidates.forEach((child) => {
    if (child === selected) {
      child.removeAttribute("display");
    } else {
      child.setAttribute("display", "none");
    }
  });
  return [];
}
