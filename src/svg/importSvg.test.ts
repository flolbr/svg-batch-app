import { describe, expect, it } from "vitest";

import { importSvgFile, restoreImportedSvg } from "./importSvg";

function svgFile(source: string, name = "template.svg"): File {
  return new File([source], name, { type: "image/svg+xml" });
}

describe("importSvgFile", () => {
  it("accepts a safe SVG and preserves supported artwork", async () => {
    const file = svgFile(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 20 20">
        <defs><linearGradient id="fade"><stop offset="0" /></linearGradient></defs>
        <g id="layer" inkscape:label="Design Layer" aria-label="Layer"><title>Greeting</title><text id="name">Hello <tspan>world</tspan></text></g>
        <use href="#layer" />
        <image href="data:image/png;base64,AA==" width="1" height="1" />
        <rect fill="url(#fade)" width="20" height="20" />
      </svg>
    `);

    const result = await importSvgFile(file);

    expect(result.fileName).toBe("template.svg");
    expect(result.fileSize).toBe(file.size);
    expect(result.sourceStatus).toBe("embedded");
    expect(result.acceptedSvg).toContain(
      '<text id="name">Hello <tspan>world</tspan></text>',
    );
    expect(result.acceptedSvg).toContain('href="#layer"');
    expect(result.acceptedSvg).toContain('fill="url(#fade)"');
    expect(result.targets).toEqual([
      { id: "layer", tagName: "g" },
      { id: "name", tagName: "text" },
    ]);
    expect(result.tree).toEqual([
      {
        id: "layer",
        label: "Design Layer",
        tagName: "g",
        children: [
          {
            id: "name",
            label: "name",
            tagName: "text",
            children: [],
          },
        ],
      },
    ]);
  });

  it("ignores Inkscape sodipodi namedview metadata", async () => {
    const result = await importSvgFile(
      svgFile(`
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">
          <sodipodi:namedview id="namedview1" pagecolor="#ffffff" />
          <rect id="card" width="10" height="10" />
        </svg>
      `),
    );

    expect(result.acceptedSvg).not.toContain("namedview");
    expect(result.targets).toEqual([{ id: "card", tagName: "rect" }]);
  });

  it("accepts local SVG color-matrix filters as resources", async () => {
    const result = await importSvgFile(
      svgFile(`
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs><filter id="tone"><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" /></filter></defs>
          <rect id="card" filter="url(#tone)" width="10" height="10" />
        </svg>
      `),
    );

    expect(result.acceptedSvg).toContain("feColorMatrix");
    expect(result.targets).toEqual([{ id: "card", tagName: "rect" }]);
  });

  it.each([
    [
      "malformed XML",
      '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>',
      "well-formed XML",
    ],
    ["non-SVG root", "<html><body /></html>", "document root"],
    [
      "unsupported script",
      '<svg xmlns="http://www.w3.org/2000/svg"><script /></svg>',
      "unsupported element",
    ],
    [
      "unsupported style",
      '<svg xmlns="http://www.w3.org/2000/svg"><style /></svg>',
      "unsupported element",
    ],
    [
      "event handler",
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" />',
      "event handler",
    ],
    [
      "remote image",
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png" /></svg>',
      "unsafe href",
    ],
    [
      "external paint server",
      '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://example.com/a.svg#paint)" /></svg>',
      "external url()",
    ],
    [
      "duplicate IDs",
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="same"/><rect id="same"/></svg>',
      "duplicate id",
    ],
    [
      "missing references",
      '<svg xmlns="http://www.w3.org/2000/svg"><use id="copy" href="#missing"/></svg>',
      "missing local href reference",
    ],
    [
      "no targets",
      '<svg xmlns="http://www.w3.org/2000/svg"><defs id="resources"/></svg>',
      "no addressable targets",
    ],
  ])("rejects %s", async (_caseName, source, message) => {
    await expect(importSvgFile(svgFile(source))).rejects.toThrow(message);
  });
});

describe("restoreImportedSvg", () => {
  it("revalidates a persisted snapshot and rebuilds derived targets and tree", () => {
    const restored = restoreImportedSvg({
      fileName: "saved.svg",
      fileSize: 42,
      acceptedSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><g id="card" aria-label="Card"><text id="name">Template</text></g></svg>',
      sourceStatus: "modified",
    });

    expect(restored).toMatchObject({
      fileName: "saved.svg",
      fileSize: 42,
      sourceStatus: "modified",
      targets: [
        { id: "card", tagName: "g" },
        { id: "name", tagName: "text" },
      ],
      tree: [
        {
          id: "card",
          label: "Card",
          tagName: "g",
          children: [
            {
              id: "name",
              label: "name",
              tagName: "text",
              children: [],
            },
          ],
        },
      ],
    });
  });

  it("rejects an unsafe persisted snapshot", () => {
    expect(() =>
      restoreImportedSvg({
        fileName: "unsafe.svg",
        fileSize: 42,
        acceptedSvg:
          '<svg xmlns="http://www.w3.org/2000/svg"><text id="name" onclick="alert(1)">Name</text></svg>',
        sourceStatus: "embedded",
      }),
    ).toThrow("event handler");
  });
});
