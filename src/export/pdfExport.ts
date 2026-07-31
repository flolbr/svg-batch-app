import { jsPDF } from "jspdf";
import "svg2pdf.js";

export type PdfExportRequest = {
  rowId: string;
  filename: string;
  svg: SVGSVGElement;
};

export type PdfPageSize = {
  width: number;
  height: number;
};

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
  ) {
    return undefined;
  }

  return { width: values[2], height: values[3] };
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
    });
    await doc.svg(request.svg, {
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
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
