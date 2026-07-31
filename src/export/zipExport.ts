import JSZip from "jszip";

export type ZipExportRequest = {
  filename: string;
  content: string | ArrayBuffer | Uint8Array;
};

export type ZipExportArchive = {
  filename: "svg-batch-export.zip";
  content: Uint8Array;
  mimeType: "application/zip";
};

export async function createZipExport(
  files: readonly ZipExportRequest[],
): Promise<ZipExportArchive> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.filename, file.content);
  }

  return {
    filename: "svg-batch-export.zip",
    content: await zip.generateAsync({ type: "uint8array" }),
    mimeType: "application/zip",
  };
}

export function downloadZipExport(archive: ZipExportArchive): void {
  const content = new Uint8Array(archive.content);
  const blob = new Blob([content.buffer], { type: archive.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = archive.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
