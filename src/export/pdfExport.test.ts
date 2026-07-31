import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPdfExportFiles,
  downloadPdfFile,
  getSvgPageSize,
  type PdfExportFile,
} from "./pdfExport";

function parseSvg(source: string): SVGSVGElement {
  return new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("getSvgPageSize", () => {
  it("uses positive unitless, px, and pt dimensions", () => {
    expect(
      getSvgPageSize(parseSvg('<svg width=" 200PX " height="72 pt"/>')),
    ).toEqual({ width: 200, height: 72 });
  });

  it("falls back to viewBox dimensions", () => {
    expect(getSvgPageSize(parseSvg('<svg viewBox="0, 0, 144, 96"/>'))).toEqual({
      width: 144,
      height: 96,
    });
  });

  it("rejects missing or invalid dimensions", () => {
    expect(() => getSvgPageSize(parseSvg("<svg/>"))).toThrow(
      "SVG page size requires positive width and height attributes or a valid viewBox.",
    );
    expect(() =>
      getSvgPageSize(
        parseSvg('<svg width="20%" height="20" viewBox="0 0 10"/>'),
      ),
    ).toThrow("SVG page size requires positive width and height attributes");
  });
});

describe("createPdfExportFiles", () => {
  it("returns empty exports and keeps requested output order", async () => {
    expect(await createPdfExportFiles([])).toEqual([]);

    const files = await createPdfExportFiles([
      {
        rowId: "row-2",
        filename: "second.pdf",
        svg: parseSvg(
          '<svg width="20" height="10"><rect width="20" height="10"/></svg>',
        ),
      },
      {
        rowId: "row-1",
        filename: "first.pdf",
        svg: parseSvg(
          '<svg width="20" height="10"><rect width="20" height="10"/></svg>',
        ),
      },
    ]);

    expect(files.map((file) => [file.rowId, file.filename])).toEqual([
      ["row-2", "second.pdf"],
      ["row-1", "first.pdf"],
    ]);
  });

  it("creates a real PDF with the requested page size without mutating the SVG", async () => {
    const svg = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="72"><rect width="144" height="72" fill="red"/></svg>',
    );
    const before = new XMLSerializer().serializeToString(svg);

    const [file] = await createPdfExportFiles([
      { rowId: "row-1", filename: "Åsa.pdf", svg },
    ]);

    expect(new TextDecoder().decode(file.content.slice(0, 4))).toBe("%PDF");
    expect(file.pageSize).toEqual({ width: 144, height: 72 });
    expect(file.filename).toBe("Åsa.pdf");
    expect(new XMLSerializer().serializeToString(svg)).toBe(before);
  });
});

describe("downloadPdfFile", () => {
  const file: PdfExportFile = {
    rowId: "row-1",
    filename: "card.pdf",
    content: new TextEncoder().encode("%PDF-test").buffer,
    mimeType: "application/pdf",
    pageSize: { width: 100, height: 50 },
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads the PDF blob and revokes its object URL", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => "blob:pdf-export",
    );
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadPdfFile(file);

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-test");
    expect(click).toHaveBeenCalledOnce();
    const clickedAnchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clickedAnchor.download).toBe("card.pdf");
    expect(clickedAnchor.href).toBe("blob:pdf-export");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:pdf-export");
  });
});
