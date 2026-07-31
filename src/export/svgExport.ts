export type SvgExportRequest = {
  rowId: string;
  filename: string;
  svg: SVGSVGElement;
};

export type SvgExportFile = {
  rowId: string;
  filename: string;
  content: string;
  mimeType: "image/svg+xml";
};

const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function createSvgExportFiles(
  requests: readonly SvgExportRequest[],
): SvgExportFile[] {
  const serializer = new XMLSerializer();
  return requests.map((request) => ({
    rowId: request.rowId,
    filename: request.filename,
    content: `${xmlDeclaration}${serializer.serializeToString(request.svg)}`,
    mimeType: "image/svg+xml",
  }));
}

export function downloadSvgFile(file: SvgExportFile): void {
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
