import * as opentype from "opentype.js";

export type ProjectFontMetadata = {
  fontFamily: string;
  fontStyle: "normal" | "italic";
  fontWeight: string;
};

export function readProjectFontMetadata(
  buffer: ArrayBuffer,
  woff2FallbackFamily?: string,
): ProjectFontMetadata {
  let font: opentype.Font;
  try {
    font = opentype.parse(buffer);
  } catch (error) {
    if (!woff2FallbackFamily) throw error;
    return {
      fontFamily: woff2FallbackFamily.replace(/\.woff2$/i, "").trim(),
      fontStyle: "normal",
      fontWeight: "400",
    };
  }
  const family = font.getEnglishName("fontFamily").trim();
  const subfamily = font.getEnglishName("fontSubfamily").toLowerCase();
  const weightClass = Number(font.tables.os2?.usWeightClass);
  if (!family) throw new Error("The font file has no family name.");

  return {
    fontFamily: family,
    fontStyle: /italic|oblique/.test(subfamily) ? "italic" : "normal",
    fontWeight:
      Number.isInteger(weightClass) && weightClass >= 1 && weightClass <= 1000
        ? String(weightClass)
        : /bold|black|heavy/.test(subfamily)
          ? "700"
          : /light|thin/.test(subfamily)
            ? "300"
            : "400",
  };
}

export type ProjectFontAsset = {
  dataUrl: string;
  mimeType: string;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: string;
};

function escapeCssString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\a ")}"`;
}

export function projectFontCss(assets: readonly ProjectFontAsset[]): string {
  const cssUrl = ["u", "r", "l", "("].join("");
  return assets
    .map((asset) => {
      const family = asset.fontFamily || "Ethnocentric";
      const format =
        asset.mimeType === "font/otf"
          ? "opentype"
          : asset.mimeType === "font/ttf"
            ? "truetype"
            : asset.mimeType === "font/woff2"
              ? "woff2"
              : "woff";
      return `@font-face{font-family:${escapeCssString(family)};src:${cssUrl}${asset.dataUrl}) format("${format}");font-style:${asset.fontStyle ?? "normal"};font-weight:${asset.fontWeight ?? "400"};font-display:block}`;
    })
    .join("");
}

export async function waitForProjectFonts(
  document: Document,
  assets: readonly ProjectFontAsset[],
): Promise<void> {
  await document.fonts.ready;
  for (const asset of assets) {
    const family = asset.fontFamily || "Ethnocentric";
    const query = `${asset.fontStyle ?? "normal"} ${asset.fontWeight ?? "400"} 16px ${escapeCssString(family)}`;
    const loadedFaces = await document.fonts.load(query);
    if (!loadedFaces.some((face) => face.status === "loaded")) {
      throw new Error(
        `The uploaded font “${family}” could not be loaded for PDF export.`,
      );
    }
  }
}
