import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { VisibilityMapping } from "./schema";
import { applyVisibilityMapping } from "./visibilityMapping";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(value: string | undefined): SourceRow {
  return {
    id: "row-1",
    values: {},
    displayedValues: value === undefined ? {} : { enabled: value },
  };
}

function mapping(
  overrides: Partial<VisibilityMapping> = {},
): VisibilityMapping {
  return {
    id: "mapping-1",
    targetId: "target",
    columnId: "enabled",
    type: "visibility",
    trueValues: ["yes"],
    falseValues: ["no"],
    emptyBehavior: "hide",
    ...overrides,
  };
}

function target(svg: SVGSVGElement): Element {
  return svg.getElementsByTagName("g")[0];
}

describe("applyVisibilityMapping", () => {
  it("normalizes whitespace and case for true and false values", () => {
    const visible = parseSvg('<svg><g id="target" display="none"/></svg>');
    const hidden = parseSvg('<svg><g id="target"/></svg>');

    expect(applyVisibilityMapping(visible, row(" YES "), mapping())).toEqual([]);
    expect(target(visible).hasAttribute("display")).toBe(false);
    expect(applyVisibilityMapping(hidden, row(" no "), mapping())).toEqual([]);
    expect(target(hidden).getAttribute("display")).toBe("none");
  });

  it("normalizes configured values", () => {
    const svg = parseSvg('<svg><g id="target" display="none"/></svg>');

    expect(
      applyVisibilityMapping(
        svg,
        row("YES"),
        mapping({ trueValues: [" yes "], falseValues: [" no "] }),
      ),
    ).toEqual([]);
    expect(target(svg).hasAttribute("display")).toBe(false);
  });

  it("applies every optional empty behavior", () => {
    const hide = parseSvg('<svg><g id="target"/></svg>');
    const show = parseSvg('<svg><g id="target" display="none"/></svg>');
    const error = parseSvg('<svg><g id="target">Template</g></svg>');

    expect(applyVisibilityMapping(hide, row("  "), mapping())).toEqual([]);
    expect(target(hide).getAttribute("display")).toBe("none");
    expect(
      applyVisibilityMapping(
        show,
        row(""),
        mapping({ emptyBehavior: "show" }),
      ),
    ).toEqual([]);
    expect(target(show).hasAttribute("display")).toBe(false);
    expect(
      applyVisibilityMapping(
        error,
        row(""),
        mapping({ emptyBehavior: "error" }),
      )[0],
    ).toMatchObject({ code: "empty-value", mappingId: "mapping-1" });
    expect(target(error).textContent).toBe("Template");
  });

  it("reports required blanks before applying an empty behavior", () => {
    const svg = parseSvg('<svg><g id="target" display="none"/></svg>');

    expect(
      applyVisibilityMapping(
        svg,
        row(""),
        mapping({ required: true, emptyBehavior: "show" }),
      )[0],
    ).toMatchObject({ code: "required-value", rowId: "row-1" });
    expect(target(svg).getAttribute("display")).toBe("none");
  });

  it("reports unknown and ambiguous values without changing the target", () => {
    const unknown = parseSvg('<svg><g id="target">Template</g></svg>');
    const ambiguous = parseSvg('<svg><g id="target">Template</g></svg>');

    expect(
      applyVisibilityMapping(unknown, row("maybe"), mapping())[0],
    ).toMatchObject({ code: "unknown-value" });
    expect(
      applyVisibilityMapping(
        ambiguous,
        row("yes"),
        mapping({ falseValues: [" YES "] }),
      )[0],
    ).toMatchObject({ code: "ambiguous-value" });
    expect(target(unknown).textContent).toBe("Template");
    expect(target(ambiguous).textContent).toBe("Template");
  });

  it("uses exact special-character target IDs and leaves caller source intact", () => {
    const source = parseSvg('<svg><g id="name.with[1]" display="none"/></svg>');
    const clone = source.cloneNode(true) as SVGSVGElement;

    expect(
      applyVisibilityMapping(
        clone,
        row("yes"),
        mapping({ targetId: "name.with[1]" }),
      ),
    ).toEqual([]);
    expect(clone.getElementsByTagName("g")[0].hasAttribute("display")).toBe(
      false,
    );
    expect(source.getElementsByTagName("g")[0].getAttribute("display")).toBe(
      "none",
    );
  });

  it("reports missing columns and targets without changing the SVG", () => {
    const column = parseSvg('<svg><g id="target">Template</g></svg>');
    const missing = parseSvg('<svg><g id="other">Template</g></svg>');

    expect(
      applyVisibilityMapping(column, row(undefined), mapping())[0],
    ).toMatchObject({ code: "missing-column", columnId: "enabled" });
    expect(
      applyVisibilityMapping(missing, row("yes"), mapping())[0],
    ).toMatchObject({ code: "missing-target", targetId: "target" });
    expect(target(column).textContent).toBe("Template");
    expect(missing.getElementsByTagName("g")[0].textContent).toBe("Template");
  });
});
