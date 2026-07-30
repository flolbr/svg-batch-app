import classes from "./SvgPreview.module.css";

type SvgPreviewProps = {
  acceptedSvg: string;
};

function previewDocument(acceptedSvg: string): string {
  return `<!doctype html><html><head><style>html,body{width:100%;height:100%;margin:0}body{display:grid;place-items:center;background:transparent}svg{display:block;max-width:100%;max-height:100%;width:auto;height:auto}</style></head><body>${acceptedSvg}</body></html>`;
}

export function SvgPreview({ acceptedSvg }: SvgPreviewProps) {
  return (
    <div className={classes.wrapper}>
      <iframe
        className={classes.frame}
        sandbox=""
        srcDoc={previewDocument(acceptedSvg)}
        title="SVG preview"
      />
    </div>
  );
}
