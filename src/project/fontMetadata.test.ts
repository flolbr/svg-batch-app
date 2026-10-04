import * as opentype from "opentype.js";
import { describe, expect, it } from "vitest";
import {
  projectFontCss,
  readProjectFontMetadata,
  type ProjectFontAsset,
} from "./fontMetadata";

function demoFontBuffer(): ArrayBuffer {
  const blank = new opentype.Glyph({ name: ".notdef", advanceWidth: 500 });
  const path = new opentype.Path();
  path.moveTo(0, 0);
  path.lineTo(500, 0);
  path.lineTo(500, 700);
  path.close();
  const glyph = new opentype.Glyph({
    name: "A",
    unicode: 65,
    advanceWidth: 600,
    path,
  });
  const font = new opentype.Font({
    familyName: "Demo Display",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [blank, glyph],
  });
  return font.toArrayBuffer();
}

function dataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:font/ttf;base64,${btoa(binary)}`;
}

function demoAsset(): ProjectFontAsset {
  return {
    dataUrl: dataUrl(demoFontBuffer()),
    mimeType: "font/ttf",
    fontFamily: "Demo Display",
    fontStyle: "normal",
    fontWeight: "400",
  };
}

describe("project font metadata", () => {
  it("reads family, style, and weight from an uploaded OpenType file", () => {
    expect(readProjectFontMetadata(demoFontBuffer())).toEqual({
      fontFamily: "Demo Display",
      fontStyle: "normal",
      fontWeight: "500",
    });
  });

  it("uses the file name as a WOFF2 family fallback when metadata cannot be parsed", () => {
    expect(
      readProjectFontMetadata(new ArrayBuffer(0), "Display Face.woff2"),
    ).toEqual({
      fontFamily: "Display Face",
      fontStyle: "normal",
      fontWeight: "400",
    });
  });

  it("creates distinct faces for multiple supplied families", () => {
    const css = projectFontCss([
      demoAsset(),
      { ...demoAsset(), fontFamily: "Second Family", fontWeight: "700" },
    ]);
    expect(css).toContain('font-family:"Demo Display"');
    expect(css).toContain('font-family:"Second Family"');
    expect(css).toContain("font-weight:700");
  });
});
