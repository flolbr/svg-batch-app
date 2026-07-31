export type ExportManifestEntry = {
  rowId: string;
  requestedFilename: string;
  actualFilename?: string;
  status: "success" | "failed" | "skipped";
  outputs: string[];
  warnings: string[];
  error?: string;
};

export type ExportManifestFile = {
  filename: "manifest.json";
  content: string;
  mimeType: "application/json";
};

export function createExportManifest(
  entries: readonly ExportManifestEntry[],
): ExportManifestFile {
  return {
    filename: "manifest.json",
    content: `${JSON.stringify(entries, null, 2)}\n`,
    mimeType: "application/json",
  };
}
