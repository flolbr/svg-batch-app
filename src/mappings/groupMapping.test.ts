import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { GroupMapping } from "./schema";
import { applyGroupMapping } from "./groupMapping";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(value: string | undefined): SourceRow {
  return {
    id: "row-1",
    values: {},
    displayedValues: value === undefined ? {} : { plan: value },
  };
}

function mapping(overrides: Partial<GroupMapping> = {}): GroupMapping {
  return {
    id: "mapping-1",
    targetId: "plans",
    columnId: "plan",
    type: "exclusive-group",
    match: "data-option",
    emptyBehavior: "hide-all",
    ...overrides,
  };
}

function child(svg: SVGSVGElement, id: string): Element | undefined {
  return Array.from(svg.getElementsByTagName("g")).find(
    (element) => element.getAttribute("id") === id,
  );
}

describe("applyGroupMapping", () => {
  it("selects canonical direct data-option children", () => {
    const svg = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic" display="none"/><g id="premium" data-option="Premium"/></g></svg>',
    );

    expect(applyGroupMapping(svg, row(" Premium "), mapping())).toEqual([]);
    expect(child(svg, "basic")?.getAttribute("display")).toBe("none");
    expect(child(svg, "premium")?.hasAttribute("display")).toBe(false);
  });

  it("falls back to direct child IDs and supports explicit ID matching", () => {
    const fallback = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/><g id="premium"/></g></svg>',
    );
    const explicit = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/><g id="premium" data-option="Premium"/></g></svg>',
    );

    expect(applyGroupMapping(fallback, row("premium"), mapping())).toEqual([]);
    expect(child(fallback, "premium")?.hasAttribute("display")).toBe(false);
    expect(
      applyGroupMapping(explicit, row("premium"), mapping({ match: "id" })),
    ).toEqual([]);
    expect(child(explicit, "basic")?.getAttribute("display")).toBe("none");
    expect(child(explicit, "premium")?.hasAttribute("display")).toBe(false);
  });

  it("only considers direct child candidates and preserves non-candidates", () => {
    const svg = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"><g id="nested" data-option="Premium"/></g><g id="premium" data-option="Premium"/><path/></g></svg>',
    );

    expect(applyGroupMapping(svg, row("Premium"), mapping())).toEqual([]);
    expect(child(svg, "basic")?.getAttribute("display")).toBe("none");
    expect(child(svg, "premium")?.hasAttribute("display")).toBe(false);
    expect(child(svg, "nested")?.hasAttribute("display")).toBe(false);
    expect(svg.getElementsByTagName("path")[0].hasAttribute("display")).toBe(
      false,
    );
  });

  it("reports duplicate direct data-option matches without mutation", () => {
    const svg = parseSvg(
      '<svg><g id="plans"><g id="first" data-option="Premium"/><g id="second" data-option=" Premium "/></g></svg>',
    );

    expect(applyGroupMapping(svg, row("Premium"), mapping())[0]).toMatchObject({
      code: "ambiguous-value",
      mappingId: "mapping-1",
    });
    expect(child(svg, "first")?.hasAttribute("display")).toBe(false);
    expect(child(svg, "second")?.hasAttribute("display")).toBe(false);
  });

  it("handles every empty path", () => {
    const hide = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/><g id="premium"/></g></svg>',
    );
    const keep = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/></g></svg>',
    );
    const error = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/></g></svg>',
    );
    const required = parseSvg(
      '<svg><g id="plans"><g id="basic" data-option="Basic"/></g></svg>',
    );

    expect(applyGroupMapping(hide, row(" "), mapping())).toEqual([]);
    expect(child(hide, "basic")?.getAttribute("display")).toBe("none");
    expect(child(hide, "premium")?.getAttribute("display")).toBe("none");
    expect(
      applyGroupMapping(
        keep,
        row(""),
        mapping({ emptyBehavior: "keep-template" }),
      ),
    ).toEqual([]);
    expect(child(keep, "basic")?.hasAttribute("display")).toBe(false);
    expect(
      applyGroupMapping(error, row(""), mapping({ emptyBehavior: "error" }))[0],
    ).toMatchObject({ code: "empty-value" });
    expect(
      applyGroupMapping(required, row(""), mapping({ required: true }))[0],
    ).toMatchObject({ code: "required-value" });
    expect(child(error, "basic")?.hasAttribute("display")).toBe(false);
    expect(child(required, "basic")?.hasAttribute("display")).toBe(false);
  });

  it("reports unknown, missing, and incompatible mappings without mutation", () => {
    const unknown = parseSvg('<svg><g id="plans"><g id="basic"/></g></svg>');
    const column = parseSvg('<svg><g id="plans"><g id="basic"/></g></svg>');
    const missing = parseSvg('<svg><g id="other"/></svg>');
    const incompatible = parseSvg(
      '<svg><text id="plans">Template</text></svg>',
    );

    expect(
      applyGroupMapping(unknown, row("other"), mapping())[0],
    ).toMatchObject({
      code: "unknown-value",
    });
    expect(
      applyGroupMapping(column, row(undefined), mapping())[0],
    ).toMatchObject({
      code: "missing-column",
    });
    expect(
      applyGroupMapping(missing, row("basic"), mapping())[0],
    ).toMatchObject({
      code: "missing-target",
    });
    expect(
      applyGroupMapping(incompatible, row("basic"), mapping())[0],
    ).toMatchObject({ code: "incompatible-target" });
    expect(child(unknown, "basic")?.hasAttribute("display")).toBe(false);
  });

  it("uses exact special-character group IDs and isolates caller clones", () => {
    const source = parseSvg(
      '<svg><g id="plans.with[1]"><g id="basic" data-option="Basic" display="none"/></g></svg>',
    );
    const clone = source.cloneNode(true) as SVGSVGElement;

    expect(
      applyGroupMapping(
        clone,
        row("Basic"),
        mapping({ targetId: "plans.with[1]" }),
      ),
    ).toEqual([]);
    expect(child(clone, "basic")?.hasAttribute("display")).toBe(false);
    expect(source.getElementsByTagName("g")[1].getAttribute("display")).toBe(
      "none",
    );
  });
});
