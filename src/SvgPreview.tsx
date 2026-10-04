import classes from "./SvgPreview.module.css";
import { projectFontCss, type ProjectFontAsset } from "./project/fontMetadata";

type SvgPreviewProps = {
  acceptedSvg: string;
  selectedTargetId?: string | null;
  zoomPercent?: number;
  fontAssets?: readonly ProjectFontAsset[];
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
  fontAssets: readonly ProjectFontAsset[] = [],
): string {
  const embeddedFont = projectFontCss(fontAssets);
  const localEthnocentric = fontAssets.some(
    (asset) =>
      (asset.fontFamily || "Ethnocentric").toLowerCase() === "ethnocentric",
  )
    ? ""
    : '@font-face{font-family:Ethnocentric;src:local("Ethnocentric"),local("Ethnocentric Regular"),local("Ethnocentric-Regular");font-style:normal;font-weight:400;font-display:block}';
  return `<!doctype html><html><head><style>${embeddedFont}${localEthnocentric}html,body{width:100%;height:100%;margin:0}body{display:grid;place-items:center;background:transparent}svg{display:block;max-width:100%;max-height:100%;width:auto;height:auto;transform:scale(${zoomPercent / 100});transform-origin:center center}[data-svg-batch-highlight]{filter:drop-shadow(0 0 5px #228be6);outline:3px solid #228be6;outline-offset:3px}</style></head><body>${previewSvg(acceptedSvg, selectedTargetId)}</body></html>`;
}

export function SvgPreview({
  acceptedSvg,
  selectedTargetId,
  zoomPercent = 100,
  fontAssets = [],
}: SvgPreviewProps) {
  return (
    <div className={classes.wrapper}>
      <iframe
        className={classes.frame}
        sandbox="allow-same-origin"
        srcDoc={previewDocument(
          acceptedSvg,
          selectedTargetId,
          zoomPercent,
          fontAssets,
        )}
        title="SVG preview"
      />
    </div>
  );
}
