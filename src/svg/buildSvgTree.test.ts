import { describe, expect, it } from "vitest";

import { buildSvgTree } from "./buildSvgTree";

function svg(contents: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">${contents}</svg>`;
}

describe("buildSvgTree", () => {
  it("nests targets under their nearest target ancestor through wrappers", () => {
    expect(
      buildSvgTree(
        svg(`
          <g id="parent"><g><rect id="child" /></g></g>
          <g><circle id="sibling" /></g>
        `),
      ),
    ).toEqual([
      {
        id: "parent",
        label: "parent",
        tagName: "g",
        children: [
          { id: "child", label: "child", tagName: "rect", children: [] },
        ],
      },
      { id: "sibling", label: "sibling", tagName: "circle", children: [] },
    ]);
  });

  it("uses trimmed labels in priority order with fallbacks", () => {
    const tree = buildSvgTree(
      svg(`
        <rect id="named" inkscape:label="  Inkscape name  " aria-label="ARIA" />
        <rect id="literal" inkscape:label="  Literal name  " />
        <rect id="aria" aria-label="  ARIA name  " />
        <g id="titled"><title>  Title name  </title></g>
        <path id="id-fallback" />
      `),
    );

    expect(tree.map((node) => node.label)).toEqual([
      "Inkscape name",
      "Literal name",
      "ARIA name",
      "Title name",
      "id-fallback",
    ]);
  });

  it("preserves document order and excludes resource descendants", () => {
    expect(
      buildSvgTree(
        svg(`
          <defs><g id="definition"><path id="definition-path" /></g></defs>
          <rect id="first" />
          <g id="second"><path id="second-child" /></g>
          <ellipse id="last" />
        `),
      ),
    ).toEqual([
      { id: "first", label: "first", tagName: "rect", children: [] },
      {
        id: "second",
        label: "second",
        tagName: "g",
        children: [
          {
            id: "second-child",
            label: "second-child",
            tagName: "path",
            children: [],
          },
        ],
      },
      { id: "last", label: "last", tagName: "ellipse", children: [] },
    ]);
  });
});
