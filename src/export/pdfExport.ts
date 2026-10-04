import {
  projectFontCss,
  waitForProjectFonts,
  type ProjectFontAsset,
} from "../project/fontMetadata";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { outlineProjectFontText } from "./projectFontOutlines";

export type PdfExportRequest = {
  rowId: string;
  filename: string;
  svg: SVGSVGElement;
  fontAssets?: readonly ProjectFontAsset[];
};

export type PdfPageSize = { width: number; height: number };

export type PdfExportFile = {
  rowId: string;
  filename: string;
  content: ArrayBuffer;
  mimeType: "application/pdf";
  pageSize: PdfPageSize;
};

function positiveDimension(value: string | null): number | undefined {
  if (value === null) return undefined;
  const match = value
    .trim()
    .match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(px|pt))?$/i);
  if (!match) return undefined;
  const dimension = Number(match[1]);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : undefined;
}

function viewBoxPageSize(svg: SVGSVGElement): PdfPageSize | undefined {
  const value = svg.getAttribute("viewBox");
  if (!value) return undefined;
  const values = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    values.length !== 4 ||
    values.some((item) => !Number.isFinite(item)) ||
    values[2] <= 0 ||
    values[3] <= 0
  )
    return undefined;
  return { width: values[2], height: values[3] };
}

function canRasterizeInBrowser(): boolean {
  if (typeof document === "undefined" || typeof Image === "undefined")
    return false;
  try {
    return Boolean(document.createElement("canvas").getContext("2d"));
  } catch {
    return false;
  }
}

async function createBrowserSvg(
  svg: SVGSVGElement,
  fontAssets: readonly ProjectFontAsset[],
): Promise<{ frame: HTMLIFrameElement; svg: SVGSVGElement }> {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.position = "fixed";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.srcdoc = `<!doctype html><html><head><style>${projectFontCss(fontAssets)}html,body{margin:0;padding:0}</style></head><body>${new XMLSerializer().serializeToString(svg)}</body></html>`;
  const loaded = new Promise<void>((resolve, reject) => {
    frame.addEventListener("load", () => resolve(), { once: true });
    frame.addEventListener(
      "error",
      () => reject(new Error("SVG preview failed to load.")),
      { once: true },
    );
  });
  document.body.append(frame);
  try {
    await loaded;
    const frameDocument = frame.contentDocument;
    if (!frameDocument) throw new Error("SVG preview document is unavailable.");
    await waitForProjectFonts(frameDocument, fontAssets);
    const renderedSvg = frameDocument.documentElement.querySelector("svg");
    if (!renderedSvg) throw new Error("SVG preview is unavailable.");
    const style = frameDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = projectFontCss(fontAssets);
    renderedSvg.insertBefore(style, renderedSvg.firstChild);
    return { frame, svg: renderedSvg as unknown as SVGSVGElement };
  } catch (error) {
    frame.remove();
    throw error;
  }
}

async function bakeMaskedImages(svg: SVGSVGElement): Promise<void> {
  const document = svg.ownerDocument;
  const namespace = "http://www.w3.org/2000/svg";
  for (const element of svg.querySelectorAll("image")) {
    const source =
      element.getAttribute("xlink:href") || element.getAttribute("href");
    if (!source) continue;
    const image = new Image();
    image.src = source;
    try {
      await image.decode();
    } catch {
      throw new Error("PDF image could not be rendered.");
    }
  }
  // Masks in Inkscape artwork often supply image alpha through grayscale PNGs.
  // svg2pdf cannot reproduce these masks; composite only their image subtree.
  for (const element of Array.from(svg.querySelectorAll("[mask], [style]"))) {
    if (!svg.contains(element) || element.closest("defs")) continue;
    const mask =
      element.getAttribute("mask") || (element as SVGElement).style.mask;
    if (
      !mask ||
      mask === "none" ||
      !(element.localName === "image" || element.querySelector("image"))
    )
      continue;
    if (
      Array.from(element.querySelectorAll("*")).some(
        (child) => !["g", "image"].includes(child.localName),
      )
    ) {
      throw new Error(
        "PDF masks containing vector artwork or text are not supported.",
      );
    }
    const bounds = (element as SVGGraphicsElement).getBBox();
    if (bounds.width <= 0 || bounds.height <= 0) continue;
    const isolated = document.createElementNS(namespace, "svg");
    for (const attribute of svg.attributes) {
      if (attribute.name.startsWith("xmlns:"))
        isolated.setAttribute(attribute.name, attribute.value);
    }
    isolated.setAttribute("width", String(bounds.width));
    isolated.setAttribute("height", String(bounds.height));
    isolated.setAttribute(
      "viewBox",
      `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
    );
    for (const resource of svg.children) {
      if (["defs", "style"].includes(resource.localName))
        isolated.append(resource.cloneNode(true));
    }
    const artwork = element.cloneNode(true) as SVGElement;
    artwork.removeAttribute("transform");
    artwork.style.removeProperty("transform");
    artwork.removeAttribute("opacity");
    artwork.style.removeProperty("opacity");
    isolated.append(artwork);
    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(isolated)], {
        type: "image/svg+xml",
      }),
    );
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("Masked PDF image could not be rendered."));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      // 300 DPI for only the masked artwork, retaining vector text elsewhere.
      const transform = (element as SVGGraphicsElement).getCTM();
      const scaleX = transform ? Math.hypot(transform.a, transform.b) : 1;
      const scaleY = transform ? Math.hypot(transform.c, transform.d) : 1;
      canvas.width = Math.max(1, Math.ceil((bounds.width * scaleX * 300) / 72));
      canvas.height = Math.max(
        1,
        Math.ceil((bounds.height * scaleY * 300) / 72),
      );
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const replacement = document.createElementNS(namespace, "image");
      for (const attribute of element.attributes)
        replacement.setAttribute(attribute.name, attribute.value);
      replacement.removeAttribute("mask");
      replacement.removeAttribute("xlink:href");
      replacement.removeAttribute("filter");
      replacement.style.removeProperty("filter");
      replacement.style.removeProperty("mask");
      replacement.setAttribute("x", String(bounds.x));
      replacement.setAttribute("y", String(bounds.y));
      replacement.setAttribute("width", String(bounds.width));
      replacement.setAttribute("height", String(bounds.height));
      replacement.setAttribute("href", canvas.toDataURL("image/png"));
      element.replaceWith(replacement);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function getSvgPageSize(svg: SVGSVGElement): PdfPageSize {
  const width = positiveDimension(svg.getAttribute("width"));
  const height = positiveDimension(svg.getAttribute("height"));
  if (width !== undefined && height !== undefined) return { width, height };
  const viewBox = viewBoxPageSize(svg);
  if (viewBox) return viewBox;
  throw new Error(
    "SVG page size requires positive width and height attributes or a valid viewBox.",
  );
}

export async function createPdfExportFiles(
  requests: readonly PdfExportRequest[],
): Promise<PdfExportFile[]> {
  const files: PdfExportFile[] = [];
  for (const request of requests) {
    const size = getSvgPageSize(request.svg);
    const doc = new jsPDF({
      unit: "pt",
      format: [size.width, size.height],
      orientation: size.width > size.height ? "landscape" : "portrait",
      compress: true,
    });
    if (canRasterizeInBrowser()) {
      const rendered = await createBrowserSvg(
        request.svg,
        request.fontAssets ?? [],
      );
      try {
        outlineProjectFontText(rendered.svg, request.fontAssets ?? []);
        await bakeMaskedImages(rendered.svg);
        await doc.svg(rendered.svg, {
          x: 0,
          y: 0,
          width: size.width,
          height: size.height,
        });
      } finally {
        rendered.frame.remove();
      }
    } else {
      await doc.svg(request.svg, {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
      });
    }
    files.push({
      rowId: request.rowId,
      filename: request.filename,
      content: doc.output("arraybuffer"),
      mimeType: "application/pdf",
      pageSize: {
        width: doc.internal.pageSize.getWidth(),
        height: doc.internal.pageSize.getHeight(),
      },
    });
  }
  return files;
}

export function downloadPdfFile(file: PdfExportFile): void {
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
