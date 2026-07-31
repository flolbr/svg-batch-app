type DownloadProjectHtmlOptions = {
  document?: Document;
  url?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

export function downloadProjectHtml(
  html: string,
  filename: string,
  {
    document: targetDocument = document,
    url: urlApi = URL,
  }: DownloadProjectHtmlOptions = {},
): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const objectUrl = urlApi.createObjectURL(blob);

  try {
    const anchor = targetDocument.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    urlApi.revokeObjectURL(objectUrl);
  }
}
