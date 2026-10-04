import type { ProjectFontAsset } from "../project/fontMetadata";
import * as opentype from "opentype.js";

type ParsedFont = {
  family: string;
  style: string;
  weight: string;
  font?: opentype.Font;
};

const SVG_NS = "http://www.w3.org/2000/svg";
const paintProperties = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "visibility",
  "display",
  "clip-path",
  "mask",
  "filter",
] as const;

function fontBytes(dataUrl: string): ArrayBuffer {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function parseAssets(assets: readonly ProjectFontAsset[]): ParsedFont[] {
  return assets.map((asset) => {
    let font: opentype.Font | undefined;
    try {
      font = opentype.parse(fontBytes(asset.dataUrl));
    } catch {
      // WOFF2 can preview, but matching unparseable faces fail outlining below.
    }
    return {
      family:
        asset.fontFamily ||
        font?.getEnglishName("fontFamily") ||
        "Ethnocentric",
      style: asset.fontStyle ?? "normal",
      weight: asset.fontWeight ?? "400",
      font,
    };
  });
}

function parseCoordinate(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const match = value.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:px)?$/i);
  if (!match)
    throw new Error("Font outline export needs numeric SVG text positions.");
  return Number(match[1]);
}

function familyName(value: string): string {
  return value
    .split(",", 1)[0]
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .toLowerCase();
}

function textRuns(
  text: SVGTextElement,
): { node: Text; styleElement: Element }[] {
  const walker = text.ownerDocument.createTreeWalker(
    text,
    NodeFilter.SHOW_TEXT,
  );
  const result: { node: Text; styleElement: Element }[] = [];
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    if (textNode.data.length > 0) {
      result.push({
        node: textNode,
        styleElement: textNode.parentElement ?? text,
      });
    }
    node = walker.nextNode();
  }
  return result;
}

function styleValue(style: CSSStyleDeclaration, property: string): string {
  return style.getPropertyValue(property).trim();
}

function copyPaint(style: CSSStyleDeclaration, target: SVGElement): void {
  const declarations = paintProperties
    .map((property) => {
      const value = styleValue(style, property);
      return value ? `${property}:${value}` : "";
    })
    .filter(Boolean)
    .join(";");
  if (declarations) target.setAttribute("style", declarations);
}

function copyGroupAttributes(source: Element, target: SVGGElement): void {
  for (const attribute of Array.from(source.attributes)) {
    if (
      [
        "x",
        "y",
        "dx",
        "dy",
        "rotate",
        "textLength",
        "lengthAdjust",
        "text-anchor",
      ].includes(attribute.name)
    )
      continue;
    target.setAttribute(attribute.name, attribute.value);
  }
}

/** Converts supplied-font, single-run SVG text to vector paths on this export clone. */
export function outlineProjectFontText(
  svg: SVGSVGElement,
  assets: readonly ProjectFontAsset[],
): number {
  const parsedFonts = parseAssets(assets);
  const view = svg.ownerDocument.defaultView;
  if (!view) throw new Error("The PDF rendering document is unavailable.");
  let outlined = 0;

  for (const text of Array.from(svg.querySelectorAll("text"))) {
    const runs = textRuns(text).filter(({ node }) => node.data.trim() !== "");
    if (runs.length === 0) continue;
    const styledRuns = runs.map((run) => ({
      ...run,
      style: view.getComputedStyle(run.styleElement),
    }));
    const matchingRuns = styledRuns.filter(({ style }) =>
      parsedFonts.some(
        (entry) => familyName(style.fontFamily) === entry.family.toLowerCase(),
      ),
    );
    if (matchingRuns.length === 0) continue;
    if (matchingRuns.length !== 1 || styledRuns.length !== 1) {
      throw new Error(
        "PDF font outlining currently requires one styled text run per SVG text element.",
      );
    }

    const [{ node, styleElement, style }] = matchingRuns;
    const family = familyName(style.fontFamily);
    const weight =
      style.fontWeight === "normal"
        ? "400"
        : style.fontWeight === "bold"
          ? "700"
          : style.fontWeight || "400";
    const fontStyle = style.fontStyle || "normal";
    const parsed = parsedFonts.find(
      (entry) =>
        entry.family.toLowerCase() === family &&
        entry.style === fontStyle &&
        entry.weight === weight,
    );
    if (!parsed) {
      throw new Error(
        `No uploaded ${fontStyle} ${weight} font face matches “${family}”.`,
      );
    }
    if (style.writingMode !== "horizontal-tb") {
      throw new Error("PDF font outlining supports horizontal SVG text only.");
    }
    if (
      text.hasAttribute("textLength") ||
      text.hasAttribute("lengthAdjust") ||
      styleElement.hasAttribute("textLength") ||
      styleElement.hasAttribute("lengthAdjust") ||
      text.hasAttribute("rotate") ||
      styleElement.hasAttribute("rotate")
    ) {
      throw new Error(
        "PDF font outlining cannot preserve textLength or per-glyph rotation.",
      );
    }

    const fontSize = Number.parseFloat(style.fontSize);
    if (!Number.isFinite(fontSize) || fontSize <= 0) {
      throw new Error("The supplied font has an invalid SVG font size.");
    }
    const textValue = node.data;
    let x = parseCoordinate(
      styleElement.getAttribute("x"),
      parseCoordinate(text.getAttribute("x"), 0),
    );
    let y = parseCoordinate(
      styleElement.getAttribute("y"),
      parseCoordinate(text.getAttribute("y"), 0),
    );
    x +=
      parseCoordinate(text.getAttribute("dx"), 0) +
      (styleElement === text
        ? 0
        : parseCoordinate(styleElement.getAttribute("dx"), 0));
    y +=
      parseCoordinate(text.getAttribute("dy"), 0) +
      (styleElement === text
        ? 0
        : parseCoordinate(styleElement.getAttribute("dy"), 0));
    if (!parsed.font) {
      throw new Error(
        `The uploaded “${family}” face cannot be outlined for sharp PDF output.`,
      );
    }
    const advance = parsed.font.getAdvanceWidth(textValue, fontSize, {
      kerning: true,
    });
    const anchor = style.textAnchor;
    if (anchor === "middle") x -= advance / 2;
    if (anchor === "end") x -= advance;

    const rootGroup = svg.ownerDocument.createElementNS(SVG_NS, "g");
    copyGroupAttributes(text, rootGroup);
    const pathGroup = svg.ownerDocument.createElementNS(SVG_NS, "g");
    if (styleElement !== text && styleElement.hasAttribute("transform")) {
      pathGroup.setAttribute(
        "transform",
        styleElement.getAttribute("transform") ?? "",
      );
    }
    const path = svg.ownerDocument.createElementNS(SVG_NS, "path");
    if (styleElement !== text && styleElement.id) path.id = styleElement.id;
    copyPaint(style, path);
    if (styleElement === text) {
      // Element opacity is already retained on the outer group.
      path.style.removeProperty("opacity");
    }
    path.setAttribute(
      "d",
      parsed.font
        .getPath(textValue, x, y, fontSize, { kerning: true })
        .toPathData(3),
    );
    pathGroup.append(path);
    rootGroup.append(pathGroup);
    text.replaceWith(rootGroup);
    outlined += 1;
  }

  return outlined;
}
