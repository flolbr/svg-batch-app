import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { TextMapping } from "./schema";
import {
  fitText,
  isTextFitMetrics,
  type TextFitMetricsProvider,
} from "./textFitting";
import type { ValidationIssue } from "./validation";

function isZeroCoordinate(value: string | null): boolean {
  return value !== null && Number.isFinite(Number(value)) && Number(value) === 0;
}

function setMappedText(target: Element, value: string): void {
  if (target.localName === "text") {
    const tspans = Array.from(target.getElementsByTagName("tspan"));
    if (tspans.length > 0) {
      const firstTspan = tspans[0];
      if (
        (target.hasAttribute("x") || target.hasAttribute("y")) &&
        isZeroCoordinate(firstTspan.getAttribute("x")) &&
        isZeroCoordinate(firstTspan.getAttribute("y"))
      ) {
        firstTspan.removeAttribute("x");
        firstTspan.removeAttribute("y");
      }

      tspans.forEach((tspan, index) => {
        tspan.textContent = index === 0 ? value : "";
      });
      return;
    }
  }

  target.textContent = value;
}

export function applyTextMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: TextMapping,
  metricsProvider?: TextFitMetricsProvider,
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

  if (mapping.fit === "keep") {
    setMappedText(target, value);
    return [];
  }

  try {
    const metrics = metricsProvider?.(target);
    if (!isTextFitMetrics(metrics)) throw new Error("Text metrics are unavailable.");

    const result = fitText(value, mapping.fit, mapping.minFontSize, metrics);
    setMappedText(target, result.text);
    if (result.fontSize !== undefined) {
      target.setAttribute("font-size", String(result.fontSize));
    }
    if (result.overflow) {
      return [
        mappingIssue(row, mapping, "text-overflow", "Text does not fit target."),
      ];
    }
    return [];
  } catch {
    return [
      mappingIssue(
        row,
        mapping,
        "text-measurement-unavailable",
        "Text measurement is unavailable.",
      ),
    ];
  }
}
