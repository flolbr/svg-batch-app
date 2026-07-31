import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSvgExportFiles,
  downloadSvgFile,
  type SvgExportFile,
} from "./svgExport";

function parseSvg(source: string): SVGSVGElement {
  return new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("createSvgExportFiles", () => {
  it("returns no files for no requests and preserves request order", () => {
    expect(createSvgExportFiles([])).toEqual([]);

    const files = createSvgExportFiles([
      { rowId: "row-2", filename: "second.svg", svg: parseSvg("<svg/>") },
      { rowId: "row-1", filename: "first.svg", svg: parseSvg("<svg/>") },
    ]);

    expect(files.map((file) => [file.rowId, file.filename])).toEqual([
      ["row-2", "second.svg"],
      ["row-1", "first.svg"],
    ]);
    expect(files.every((file) => file.mimeType === "image/svg+xml")).toBe(true);
  });

  it("serializes mapped SVGs with Unicode without mutating requests", () => {
    const svg = parseSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Åsa</text></svg>',
    );
    const before = new XMLSerializer().serializeToString(svg);
    const request = { rowId: "row-1", filename: "Åsa.svg", svg };

    const [file] = createSvgExportFiles([request]);

    expect(file.content).toBe(
      `${'<?xml version="1.0" encoding="UTF-8"?>\n'}${before}`,
    );
    expect(file.content).toContain("Åsa");
    expect(request).toEqual({ rowId: "row-1", filename: "Åsa.svg", svg });
    expect(new XMLSerializer().serializeToString(svg)).toBe(before);
  });
});

describe("downloadSvgFile", () => {
  const file: SvgExportFile = {
    rowId: "row-1",
    filename: "card.svg",
    content: "<svg>Åsa</svg>",
    mimeType: "image/svg+xml",
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads one SVG blob with its requested filename and revokes the URL", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => "blob:svg-export",
    );
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadSvgFile(file);

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/svg+xml");
    expect(await blob.text()).toBe(file.content);
    expect(click).toHaveBeenCalledOnce();
    const clickedAnchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clickedAnchor.download).toBe("card.svg");
    expect(clickedAnchor.href).toBe("blob:svg-export");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:svg-export");
  });
});
