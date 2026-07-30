import { describe, expect, it } from "vitest";

import { validateSvgTargets } from "./validateSvgTargets";

function svg(contents: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${contents}</svg>`;
}

describe("validateSvgTargets", () => {
  it("returns addressable IDs in document order and excludes resources", () => {
    const targets = validateSvgTargets(
      svg(`
      <defs>
        <linearGradient id="fade" />
        <clipPath id="clip"><path id="clip-shape" /></clipPath>
        <symbol id="icon"><path id="icon-path" /></symbol>
      </defs>
      <g id="group" />
      <text id="heading"><tspan id="line">Hello</tspan></text>
      <rect id="box" />
    `),
    );

    expect(targets).toEqual([
      { id: "group", tagName: "g" },
      { id: "heading", tagName: "text" },
      { id: "line", tagName: "tspan" },
      { id: "box", tagName: "rect" },
    ]);
  });

  it.each([
    ["empty IDs", svg('<path id="" />'), "empty id attribute"],
    [
      "duplicate IDs anywhere in the document",
      svg('<defs><linearGradient id="shared" /></defs><rect id="shared" />'),
      'duplicate id "shared"',
    ],
  ])("rejects %s", (_caseName, source, message) => {
    expect(() => validateSvgTargets(source)).toThrow(
      `SVG target validation failed: ${message}`,
    );
  });

  it("rejects missing local href and xlink:href references", () => {
    expect(() =>
      validateSvgTargets(
        svg('<use href="#missing" /><use xlink:href="#also-missing" />'),
      ),
    ).toThrow(
      'SVG target validation failed: missing local href reference "#missing"',
    );

    expect(() =>
      validateSvgTargets(svg('<use xlink:href="#also-missing" />')),
    ).toThrow(
      'SVG target validation failed: missing local href reference "#also-missing"',
    );
  });

  it("rejects SVGs without addressable targets", () => {
    expect(() =>
      validateSvgTargets(svg('<defs><linearGradient id="fade" /></defs>')),
    ).toThrow(
      "SVG target validation failed: the SVG has no addressable targets",
    );
  });
});
