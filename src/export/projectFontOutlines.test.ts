import * as opentype from "opentype.js";
import { describe, expect, it } from "vitest";
import { outlineProjectFontText } from "./projectFontOutlines";
import { type ProjectFontAsset } from "../project/fontMetadata";

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

describe("project font export", () => {
  it("outlines a supplied-font text run on the SVG clone", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.innerHTML = `<text id="team" x="100" y="80" text-anchor="middle"><tspan style="font-family:'Demo Display';font-size:20px;writing-mode:horizontal-tb;fill:#123456">A</tspan></text>`;
    document.body.append(svg);

    expect(outlineProjectFontText(svg, [demoAsset()])).toBe(1);
    expect(svg.querySelector("text")).toBeNull();
    expect(svg.querySelector("g#team path")?.getAttribute("d")).toContain("M");
    expect(svg.querySelector("g#team path")?.getAttribute("style")).toContain(
      "rgb(18, 52, 86)",
    );
    svg.remove();
  });

  it("applies direct text offsets once and preserves opacity and unique IDs", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.innerHTML = `<text id="team" x="100" y="80" dx="10" dy="5" style="font-family:'Demo Display';font-size:20px;writing-mode:horizontal-tb;opacity:0.5">A</text>`;
    document.body.append(svg);
    expect(outlineProjectFontText(svg, [demoAsset()])).toBe(1);
    const font = opentype.parse(demoFontBuffer());
    expect(svg.querySelector("path")!.getAttribute("d")).toBe(
      font.getPath("A", 110, 85, 20, { kerning: true }).toPathData(3),
    );
    expect(svg.querySelectorAll("#team")).toHaveLength(1);
    expect((svg.querySelector("g") as SVGElement).style.opacity).toBe("0.5");
    expect((svg.querySelector("path") as SVGElement).style.opacity).toBe("");
    svg.remove();
  });

  it("uses the matching face for separate uploaded font families", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.innerHTML = `<text x="20" y="40"><tspan style="font-family:'Demo Display';font-size:20px;writing-mode:horizontal-tb">A</tspan></text><text x="20" y="80"><tspan style="font-family:'Second Display';font-size:20px;writing-mode:horizontal-tb">B</tspan></text>`;
    document.body.append(svg);

    expect(
      outlineProjectFontText(svg, [
        demoAsset(),
        { ...demoAsset(), fontFamily: "Second Display" },
      ]),
    ).toBe(2);
    expect(svg.querySelectorAll("g path")).toHaveLength(2);
    svg.remove();
  });
});
