import * as opentype from "opentype.js";
import { createPdfExportFiles } from "../../src/export/pdfExport";

function makeTestFontDataUrl(): string {
  const notdef = new opentype.Glyph({ name: ".notdef", advanceWidth: 600 });
  const glyphs = [notdef];
  for (let codePoint = 65; codePoint <= 90; codePoint += 1) {
    const path = new opentype.Path();
    path.moveTo(30, 0);
    path.lineTo(430 + (codePoint % 7) * 12, 0);
    path.lineTo(430 + (codePoint % 7) * 12, 700);
    path.lineTo(30, 700);
    path.close();
    glyphs.push(
      new opentype.Glyph({
        name: String.fromCharCode(codePoint),
        unicode: codePoint,
        advanceWidth: 600,
        path,
      }),
    );
  }
  const font = new opentype.Font({
    familyName: "Browser Test Face",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs,
  });
  const bytes = new Uint8Array(font.toArrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:font/ttf;base64,${btoa(binary)}`;
}

function rowSvg(value: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "320");
  svg.setAttribute("height", "180");
  svg.setAttribute("viewBox", "0 0 320 180");
  const background = document.createElementNS(svg.namespaceURI, "rect");
  background.setAttribute("width", "320");
  background.setAttribute("height", "180");
  background.setAttribute("fill", "white");
  const text = document.createElementNS(svg.namespaceURI, "text");
  text.setAttribute("x", "160");
  text.setAttribute("y", "110");
  text.setAttribute("text-anchor", "middle");
  const span = document.createElementNS(svg.namespaceURI, "tspan");
  span.setAttribute(
    "style",
    'font-family:"Browser Test Face";font-size:48px;writing-mode:horizontal-tb;fill:#162f5b',
  );
  span.textContent = value;
  text.append(span);
  svg.append(background, text);
  return svg;
}

function rowSvgWithTransparentImage(value: string): SVGSVGElement {
  const svg = rowSvg(value);
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable.");
  context.fillStyle = "#00a5cf";
  context.beginPath();
  context.arc(12, 12, 8, 0, Math.PI * 2);
  context.fill();
  const image = document.createElementNS(svg.namespaceURI, "image");
  image.setAttribute("href", canvas.toDataURL("image/png"));
  image.setAttribute("x", "20");
  image.setAttribute("y", "20");
  image.setAttribute("width", "96");
  image.setAttribute("height", "96");
  svg.insertBefore(image, svg.lastChild);
  return svg;
}

function rowSvgWithMaskedImage(value: string): SVGSVGElement {
  const svg = rowSvgWithTransparentImage(value);
  const image = svg.querySelector("image")!;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "black";
  context.fillRect(0, 0, 24, 24);
  context.fillStyle = "white";
  context.beginPath();
  context.arc(12, 12, 8, 0, Math.PI * 2);
  context.fill();
  const defs = document.createElementNS(svg.namespaceURI, "defs");
  defs.innerHTML = `<filter id="mask-alpha" x="0" y="0" width="1" height="1"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.2126 0.7152 0.0722 0 0" color-interpolation-filters="sRGB"/></filter><mask id="art-mask"><g filter="url(#mask-alpha)"><image href="${canvas.toDataURL("image/png")}" x="20" y="20" width="96" height="96"/></g></mask>`;
  context.fillStyle = "#00a5cf";
  context.fillRect(0, 0, 24, 24);
  image.setAttribute("href", canvas.toDataURL("image/png"));
  const group = document.createElementNS(svg.namespaceURI, "g");
  group.setAttribute("mask", "url(#art-mask)");
  group.setAttribute("opacity", "0.8");
  image.replaceWith(group);
  group.append(image);
  svg.prepend(defs);
  return svg;
}

declare global {
  interface Window {
    exportFontRegression(): Promise<string[]>;
  }
}

window.exportFontRegression = async () => {
  const fontAssets = [
    {
      dataUrl: makeTestFontDataUrl(),
      mimeType: "font/ttf",
      fontFamily: "Browser Test Face",
      fontStyle: "normal" as const,
      fontWeight: "400",
    },
  ];
  const masked = rowSvgWithMaskedImage("ALPHA");
  const before = new XMLSerializer().serializeToString(masked);
  const files = await createPdfExportFiles([
    { rowId: "alpha", filename: "alpha.pdf", svg: rowSvg("ALPHA"), fontAssets },
    { rowId: "beta", filename: "beta.pdf", svg: rowSvg("BETA"), fontAssets },
    {
      rowId: "image-alpha",
      filename: "image-alpha.pdf",
      svg: rowSvgWithTransparentImage("ALPHA"),
      fontAssets,
    },
    {
      rowId: "masked-alpha",
      filename: "masked-alpha.pdf",
      svg: masked,
      fontAssets,
    },
  ]);
  if (new XMLSerializer().serializeToString(masked) !== before)
    throw new Error("PDF export mutated the source SVG.");
  const unsupported = rowSvgWithMaskedImage("ALPHA");
  unsupported
    .querySelector("g[mask]")!
    .append(document.createElementNS(unsupported.namespaceURI, "path"));
  const broken = rowSvgWithMaskedImage("ALPHA");
  broken
    .querySelector("g[mask] > image")!
    .setAttribute("href", "data:image/png;base64,broken");
  for (const [svg, expected] of [
    [unsupported, "vector artwork or text"],
    [broken, "could not be rendered"],
  ] as const) {
    let failure = "";
    try {
      await createPdfExportFiles([
        { rowId: "invalid", filename: "invalid.pdf", svg, fontAssets },
      ]);
    } catch (error) {
      failure = String(error);
    }
    if (!failure.includes(expected))
      throw new Error(
        `Expected visible export failure: ${expected}, got ${failure}`,
      );
  }
  return files.map((file) => {
    const bytes = new Uint8Array(file.content);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
};
