import QRCode from "qrcode";
import type { SourceRow } from "../data/normalizeWorkbook";
import { findElementById, mappingIssue } from "./mappingUtils";
import type { QrMapping } from "./schema";
import type { ValidationIssue } from "./validation";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function numberAttribute(
  element: Element,
  name: string,
  fallback?: number,
): number | undefined {
  const value = element.getAttribute(name);
  if (value === null) return fallback;
  if (value.trim() === "") return undefined;

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function boundsFromTarget(target: Element): Bounds | undefined {
  const rect = Array.from(target.children).find(
    (child) => child.localName === "rect",
  );
  if (!rect) return undefined;

  const x = numberAttribute(rect, "x", 0);
  const y = numberAttribute(rect, "y", 0);
  const width = numberAttribute(rect, "width");
  const height = numberAttribute(rect, "height");
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  ) {
    return undefined;
  }

  return { x, y, width, height };
}

function qrPath(matrix: QRCode.QRCode["modules"], margin: number): string {
  const commands: string[] = [];
  for (let row = 0; row < matrix.size; row += 1) {
    for (let column = 0; column < matrix.size; column += 1) {
      if (matrix.get(row, column)) {
        commands.push(`M${column + margin} ${row + margin}h1v1h-1z`);
      }
    }
  }
  return commands.join("");
}

function vectorGroup(
  target: Element,
  bounds: Bounds,
  matrix: QRCode.QRCode["modules"],
  margin: number,
): SVGGElement {
  const totalModules = matrix.size + margin * 2;
  const size = Math.min(bounds.width, bounds.height);
  const x = bounds.x + (bounds.width - size) / 2;
  const y = bounds.y + (bounds.height - size) / 2;
  const document = target.ownerDocument;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  group.setAttribute(
    "transform",
    `translate(${x} ${y}) scale(${size / totalModules})`,
  );
  group.setAttribute("shape-rendering", "crispEdges");
  background.setAttribute("width", String(totalModules));
  background.setAttribute("height", String(totalModules));
  background.setAttribute("fill", "white");
  path.setAttribute("fill", "black");
  path.setAttribute("d", qrPath(matrix, margin));
  group.append(background, path);
  return group;
}

export function applyQrMapping(
  svg: SVGSVGElement,
  row: SourceRow,
  mapping: QrMapping,
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
  if (target.localName !== "g") {
    return [
      mappingIssue(
        row,
        mapping,
        "incompatible-target",
        "QR mapping requires a g target.",
      ),
    ];
  }

  if (value.trim() === "") {
    if (mapping.required || mapping.emptyBehavior === "error") {
      return [
        mappingIssue(
          row,
          mapping,
          mapping.required ? "required-value" : "empty-value",
          mapping.required
            ? "Required QR value is blank."
            : "QR value is blank.",
        ),
      ];
    }
    target.setAttribute("display", "none");
    return [];
  }

  const bounds = boundsFromTarget(target);
  if (!bounds) {
    return [
      mappingIssue(row, mapping, "invalid-bounds", "QR bounds are invalid."),
    ];
  }

  let matrix: QRCode.QRCode["modules"];
  try {
    matrix = QRCode.create(value, {
      errorCorrectionLevel: mapping.errorCorrection,
    }).modules;
  } catch {
    return [
      mappingIssue(
        row,
        mapping,
        "qr-generation-failed",
        "QR code could not be generated.",
      ),
    ];
  }

  target.replaceChildren(
    vectorGroup(target, bounds, matrix, mapping.marginModules),
  );
  target.removeAttribute("display");
  return [];
}
