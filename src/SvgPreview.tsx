import classes from "./SvgPreview.module.css";

type SvgPreviewProps = {
  acceptedSvg: string;
  selectedTargetId?: string | null;
  zoomPercent?: number;
};

function previewSvg(
  acceptedSvg: string,
  selectedTargetId?: string | null,
): string {
  if (!selectedTargetId) return acceptedSvg;

  const document = new DOMParser().parseFromString(
    acceptedSvg,
    "image/svg+xml",
  );
  const target = Array.from(document.getElementsByTagName("*")).find(
    (element) => element.getAttribute("id") === selectedTargetId,
  );
  target?.setAttribute("data-svg-batch-highlight", "true");
  return document.documentElement.outerHTML;
}

function previewDocument(
  acceptedSvg: string,
  selectedTargetId?: string | null,
  zoomPercent = 100,
): string {
  return `<!doctype html><html><head><style>html,body{width:100%;height:100%;margin:0}body{display:grid;place-items:center;background:transparent}svg{display:block;max-width:100%;max-height:100%;width:auto;height:auto;transform:scale(${zoomPercent / 100});transform-origin:center center}[data-svg-batch-highlight]{filter:drop-shadow(0 0 5px #228be6);outline:3px solid #228be6;outline-offset:3px}</style></head><body>${previewSvg(acceptedSvg, selectedTargetId)}</body></html>`;
}

export function SvgPreview({
  acceptedSvg,
  selectedTargetId,
  zoomPercent = 100,
}: SvgPreviewProps) {
  return (
    <div className={classes.wrapper}>
      <iframe
        className={classes.frame}
        sandbox=""
        srcDoc={previewDocument(acceptedSvg, selectedTargetId, zoomPercent)}
        title="SVG preview"
      />
    </div>
  );
}
