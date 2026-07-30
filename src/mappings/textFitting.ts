export type TextFitMetrics = {
  availableWidth: number;
  fontSize: number;
  measure: (text: string, fontSize: number) => number;
};

export type TextFitMetricsProvider = (
  target: Element,
) => TextFitMetrics | undefined;

export type TextFitResult = {
  text: string;
  fontSize?: number;
  overflow: boolean;
};

function measuredWidth(
  metrics: TextFitMetrics,
  text: string,
  fontSize: number,
): number {
  const width = metrics.measure(text, fontSize);
  if (!Number.isFinite(width) || width < 0) {
    throw new Error("Text measurement is invalid.");
  }
  return width;
}

function roundedFontSize(fontSize: number): number {
  return Math.round(fontSize * 100) / 100;
}

export function isTextFitMetrics(value: unknown): value is TextFitMetrics {
  if (!value || typeof value !== "object") return false;

  const metrics = value as TextFitMetrics;
  return (
    Number.isFinite(metrics.availableWidth) &&
    metrics.availableWidth > 0 &&
    Number.isFinite(metrics.fontSize) &&
    metrics.fontSize > 0 &&
    typeof metrics.measure === "function"
  );
}

export function fitText(
  text: string,
  mode: "shrink" | "truncate" | "error",
  minFontSize: number | undefined,
  metrics: TextFitMetrics,
): TextFitResult {
  const fullWidth = measuredWidth(metrics, text, metrics.fontSize);
  if (fullWidth <= metrics.availableWidth) {
    return { text, overflow: false };
  }

  if (mode === "error") {
    return { text, overflow: true };
  }

  if (mode === "shrink") {
    const proportionalSize = roundedFontSize(
      metrics.fontSize * (metrics.availableWidth / fullWidth),
    );
    const fontSize = roundedFontSize(
      minFontSize === undefined
        ? proportionalSize
        : Math.max(minFontSize, proportionalSize),
    );
    return {
      text,
      fontSize,
      overflow: measuredWidth(metrics, text, fontSize) > metrics.availableWidth,
    };
  }

  const ellipsis = "…";
  if (measuredWidth(metrics, ellipsis, metrics.fontSize) > metrics.availableWidth) {
    return { text: "", overflow: false };
  }

  const characters = Array.from(text);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, middle).join("")}${ellipsis}`;
    if (measuredWidth(metrics, candidate, metrics.fontSize) <= metrics.availableWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return {
    text: `${characters.slice(0, low).join("")}${ellipsis}`,
    overflow: false,
  };
}
