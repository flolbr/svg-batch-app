import type { SourceRow } from "../data/normalizeWorkbook";
import { applyGroupMapping } from "./groupMapping";
import { applyImageMapping, type ImageValueResolver } from "./imageMapping";
import { applyQrMapping } from "./qrMapping";
import type { Mapping } from "./schema";
import { applyTextMapping } from "./textMapping";
import type { TextFitMetricsProvider } from "./textFitting";
import type { ValidationIssue } from "./validation";
import { applyVisibilityMapping } from "./visibilityMapping";

export type MappingResult = {
  svg: SVGSVGElement;
  issues: ValidationIssue[];
};

export type ApplyMappingsOptions = {
  imageValueResolver?: ImageValueResolver;
  textMetricsProvider?: TextFitMetricsProvider;
};

const mappingTypeOrder: readonly Mapping["type"][] = [
  "exclusive-group",
  "visibility",
  "text",
  "image",
  "qr",
];

export function applyMappings(
  template: SVGSVGElement,
  row: SourceRow,
  mappings: readonly Mapping[],
  options: ApplyMappingsOptions = {},
): MappingResult {
  const svg = template.cloneNode(true) as SVGSVGElement;
  const issues: ValidationIssue[] = [];

  for (const type of mappingTypeOrder) {
    for (const mapping of mappings) {
      if (mapping.type !== type) continue;

      switch (mapping.type) {
        case "exclusive-group":
          issues.push(...applyGroupMapping(svg, row, mapping));
          break;
        case "visibility":
          issues.push(...applyVisibilityMapping(svg, row, mapping));
          break;
        case "text":
          issues.push(
            ...applyTextMapping(svg, row, mapping, options.textMetricsProvider),
          );
          break;
        case "image":
          issues.push(
            ...applyImageMapping(svg, row, mapping, options.imageValueResolver),
          );
          break;
        case "qr":
          issues.push(...applyQrMapping(svg, row, mapping));
          break;
      }
    }
  }

  return { svg, issues };
}
