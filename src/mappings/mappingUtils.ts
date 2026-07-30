import type { SourceRow } from "../data/normalizeWorkbook";
import type { BaseMapping } from "./schema";
import type { ValidationIssue } from "./validation";

export function findElementById(
  svg: SVGSVGElement,
  id: string,
): Element | undefined {
  if (svg.getAttribute("id") === id) return svg;

  return Array.from(svg.getElementsByTagName("*")).find(
    (element) => element.getAttribute("id") === id,
  );
}

export function mappingIssue(
  row: SourceRow,
  mapping: BaseMapping,
  code: string,
  message: string,
): ValidationIssue {
  return {
    level: "error",
    code,
    message,
    rowId: row.id,
    mappingId: mapping.id,
    targetId: mapping.targetId,
    columnId: mapping.columnId,
  };
}
