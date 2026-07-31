import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createZipExport,
  downloadZipExport,
  type ZipExportArchive,
} from "./zipExport";

describe("createZipExport", () => {
  it("creates a valid empty ZIP for no files", async () => {
    const archive = await createZipExport([]);

    expect(archive.filename).toBe("svg-batch-export.zip");
    expect(archive.mimeType).toBe("application/zip");
    expect((await JSZip.loadAsync(archive.content)).file(/.*/)).toEqual([]);
  });

  it("preserves ordered Unicode names and binary contents without mutating inputs", async () => {
    const binary = new Uint8Array([0, 255, 10, 42]);
    const files = [
      { filename: "Åsa.svg", content: "<svg>Åsa</svg>" },
      { filename: "資料.raw.bin", content: binary },
      {
        filename: "last.txt",
        content: new Uint8Array([102, 105, 110, 97, 108]).buffer,
      },
    ] as const;
    const before = [...binary];

    const archive = await createZipExport(files);
    const zip = await JSZip.loadAsync(archive.content);

    expect(Object.keys(zip.files)).toEqual([
      "Åsa.svg",
      "資料.raw.bin",
      "last.txt",
    ]);
    expect(await zip.file("Åsa.svg")?.async("string")).toBe("<svg>Åsa</svg>");
    expect(await zip.file("資料.raw.bin")?.async("uint8array")).toEqual(binary);
    expect(await zip.file("last.txt")?.async("string")).toBe("final");
    expect([...binary]).toEqual(before);
    expect(files[0]).toEqual({
      filename: "Åsa.svg",
      content: "<svg>Åsa</svg>",
    });
    expect(files[1].content).toBe(binary);
  });
});

describe("downloadZipExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads the ZIP blob and revokes its object URL", async () => {
    const archive: ZipExportArchive = {
      filename: "svg-batch-export.zip",
      content: new Uint8Array([80, 75, 3, 4]),
      mimeType: "application/zip",
    };
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => "blob:zip-export",
    );
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadZipExport(archive);

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("application/zip");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(archive.content);
    expect(click).toHaveBeenCalledOnce();
    const clickedAnchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clickedAnchor.download).toBe("svg-batch-export.zip");
    expect(clickedAnchor.href).toBe("blob:zip-export");
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:zip-export");
  });
});
