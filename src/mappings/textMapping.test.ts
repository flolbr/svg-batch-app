import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { TextMapping } from "./schema";
import { applyTextMapping } from "./textMapping";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(displayedValues: Record<string, string>): SourceRow {
  return { id: "row-1", values: {}, displayedValues };
}

function mapping(overrides: Partial<TextMapping> = {}): TextMapping {
  return {
    id: "mapping-1",
    targetId: "target",
    columnId: "name",
    type: "text",
    fit: "keep",
    ...overrides,
  };
}

describe("applyTextMapping", () => {
  it("replaces text content on text targets and caller-owned clones", () => {
    const source = parseSvg(
      '<svg><text id="target"><tspan>Template</tspan></text></svg>',
    );
    const clone = source.cloneNode(true) as SVGSVGElement;

    expect(applyTextMapping(clone, row({ name: "Ada" }), mapping())).toEqual(
      [],
    );
    expect(clone.querySelector("text")?.textContent).toBe("Ada");
    expect(clone.querySelector("tspan")).toBeNull();
    expect(source.querySelector("text")?.textContent).toBe("Template");
  });

  it("replaces text content on tspan targets with special-character IDs", () => {
    const svg = parseSvg(
      '<svg><text><tspan id="name.with[1]">Template</tspan></text></svg>',
    );

    expect(
      applyTextMapping(
        svg,
        row({ name: "Grace" }),
        mapping({ targetId: "name.with[1]" }),
      ),
    ).toEqual([]);
    expect(svg.getElementsByTagName("tspan")[0].textContent).toBe("Grace");
  });

  it("applies an empty optional value", () => {
    const svg = parseSvg('<svg><text id="target">Template</text></svg>');

    expect(applyTextMapping(svg, row({ name: "" }), mapping())).toEqual([]);
    expect(svg.getElementsByTagName("text")[0].textContent).toBe("");
  });

  it("reports a blank required value without changing the target", () => {
    const svg = parseSvg('<svg><text id="target">Template</text></svg>');

    expect(
      applyTextMapping(svg, row({ name: "   " }), mapping({ required: true })),
    ).toEqual([
      {
        level: "error",
        code: "required-value",
        message: "Required text value is blank.",
        rowId: "row-1",
        mappingId: "mapping-1",
        targetId: "target",
        columnId: "name",
      },
    ]);
    expect(svg.getElementsByTagName("text")[0].textContent).toBe("Template");
  });

  it("reports a missing mapped column without changing the SVG", () => {
    const svg = parseSvg('<svg><text id="target">Template</text></svg>');

    expect(applyTextMapping(svg, row({}), mapping())[0]).toMatchObject({
      code: "missing-column",
      rowId: "row-1",
      mappingId: "mapping-1",
      targetId: "target",
      columnId: "name",
    });
    expect(svg.getElementsByTagName("text")[0].textContent).toBe("Template");
  });

  it("reports missing and incompatible targets without changing the SVG", () => {
    const missing = parseSvg('<svg><text id="other">Template</text></svg>');
    const incompatible = parseSvg('<svg><g id="target">Template</g></svg>');

    expect(
      applyTextMapping(missing, row({ name: "Ada" }), mapping())[0],
    ).toMatchObject({
      code: "missing-target",
      targetId: "target",
    });
    expect(
      applyTextMapping(incompatible, row({ name: "Ada" }), mapping())[0],
    ).toMatchObject({
      code: "incompatible-target",
      targetId: "target",
    });
    expect(missing.getElementsByTagName("text")[0].textContent).toBe(
      "Template",
    );
    expect(incompatible.getElementsByTagName("g")[0].textContent).toBe(
      "Template",
    );
  });
});
