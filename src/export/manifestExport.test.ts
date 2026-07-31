import { describe, expect, it } from "vitest";
import {
  createExportManifest,
  type ExportManifestEntry,
} from "./manifestExport";

describe("createExportManifest", () => {
  it("creates a deterministic empty manifest", () => {
    expect(createExportManifest([])).toEqual({
      filename: "manifest.json",
      content: "[]\n",
      mimeType: "application/json",
    });
  });

  it("preserves input order and every supplied manifest field", () => {
    const entries: ExportManifestEntry[] = [
      {
        rowId: "row-2",
        requestedFilename: "requested-\u00c5sa.svg",
        actualFilename: "actual-\u00c5sa-2.svg",
        status: "success",
        outputs: ["actual-\u00c5sa-2.svg", "selected-data.csv"],
        warnings: ["Font \u8cc7\u6599 unavailable"],
      },
      {
        rowId: "row-1",
        requestedFilename: "broken.svg",
        status: "failed",
        outputs: [],
        warnings: ["Retried once"],
        error: "Mapping failed \u2014 \u041e\u0448\u0438\u0431\u043a\u0430",
      },
      {
        rowId: "row-3",
        requestedFilename: "skipped.svg",
        status: "skipped",
        outputs: [],
        warnings: [],
      },
    ];
    const before = structuredClone(entries);

    const manifest = createExportManifest(entries);

    expect(manifest.content).toBe(`[
  {
    "rowId": "row-2",
    "requestedFilename": "requested-\u00c5sa.svg",
    "actualFilename": "actual-\u00c5sa-2.svg",
    "status": "success",
    "outputs": [
      "actual-\u00c5sa-2.svg",
      "selected-data.csv"
    ],
    "warnings": [
      "Font \u8cc7\u6599 unavailable"
    ]
  },
  {
    "rowId": "row-1",
    "requestedFilename": "broken.svg",
    "status": "failed",
    "outputs": [],
    "warnings": [
      "Retried once"
    ],
    "error": "Mapping failed \u2014 \u041e\u0448\u0438\u0431\u043a\u0430"
  },
  {
    "rowId": "row-3",
    "requestedFilename": "skipped.svg",
    "status": "skipped",
    "outputs": [],
    "warnings": []
  }
]\n`);
    expect(JSON.parse(manifest.content)).toEqual(entries);
    expect(entries).toEqual(before);
  });
});
