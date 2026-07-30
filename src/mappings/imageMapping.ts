import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { ImageMapping } from "./schema";
import type { ValidationIssue } from "./validation";

export type ImageValueResolver = (value: string) => string | undefined;

const rasterDataUrl = /^data:image\/(png|jpeg|gif|webp|avif)(;[^,]*)?,/i;

function positiveNumberAttribute(element: Element, name: string): boolean {
  const value = element.getAttribute(name);
  if (value === null || value.trim() === "") return false;

  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function isDirectImageValue(value: string): boolean {
  return rasterDataUrl.test(value);
}

function isResolvedImageHref(value: string): boolean {
  return (
    isDirectImageValue(value) ||
    value.startsWith("blob:") ||
    value.startsWith("https://")
  );
}

function preserveAspectRatio(fit: ImageMapping["fit"]): string {
  if (fit === "contain") return "xMidYMid meet";
  if (fit === "cover") return "xMidYMid slice";
  return "none";
}

export function applyImageMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: ImageMapping,
  resolveImage?: ImageValueResolver,
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
  if (target.localName !== "image") {
    return [
      mappingIssue(
        row,
        mapping,
        "incompatible-target",
        "Image mapping requires an image target.",
      ),
    ];
  }

  const value = sourceValue.trim();
  if (value === "") {
    if (mapping.required || mapping.emptyBehavior === "error") {
      return [
        mappingIssue(
          row,
          mapping,
          mapping.required ? "required-value" : "empty-value",
          mapping.required
            ? "Required image value is blank."
            : "Image value is blank.",
        ),
      ];
    }
    if (mapping.emptyBehavior === "hide")
      target.setAttribute("display", "none");
    return [];
  }

  if (
    !positiveNumberAttribute(target, "width") ||
    !positiveNumberAttribute(target, "height")
  ) {
    return [
      mappingIssue(row, mapping, "invalid-bounds", "Image bounds are invalid."),
    ];
  }

  let href: string | undefined;
  if (resolveImage) {
    try {
      href = resolveImage(value);
    } catch {
      return [
        mappingIssue(
          row,
          mapping,
          "image-resolver-failed",
          "Image resolver failed.",
        ),
      ];
    }
    if (href === undefined) {
      return [
        mappingIssue(
          row,
          mapping,
          "missing-image",
          "Image asset is unavailable.",
        ),
      ];
    }
    href = href.trim();
    if (!isResolvedImageHref(href)) {
      return [
        mappingIssue(row, mapping, "unsafe-image", "Image URL is not allowed."),
      ];
    }
  } else {
    href = value;
    if (!isDirectImageValue(href)) {
      return [
        mappingIssue(row, mapping, "unsafe-image", "Image URL is not allowed."),
      ];
    }
  }

  target.setAttribute("href", href);
  target.removeAttribute("xlink:href");
  target.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
  target.removeAttribute("display");
  target.setAttribute("preserveAspectRatio", preserveAspectRatio(mapping.fit));
  return [];
}
