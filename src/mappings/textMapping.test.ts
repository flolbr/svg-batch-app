import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { TextMapping } from "./schema";
import { applyTextMapping } from "./textMapping";
import type { TextFitMetricsProvider } from "./textFitting";

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
  const metrics: TextFitMetricsProvider = () => ({
    availableWidth: 20,
    fontSize: 10,
    measure: (text, fontSize) => Array.from(text).length * fontSize,
  });

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

  it("keeps direct text behavior without a metrics provider", () => {
    const svg = parseSvg('<svg><text id="target" font-size="12">Old</text></svg>');

    expect(
      applyTextMapping(svg, row({ name: "Ada" }), mapping({ fit: "keep" })),
    ).toEqual([]);
    expect(svg.getElementsByTagName("text")[0].textContent).toBe("Ada");
    expect(svg.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "12",
    );
  });

  it("applies fitting modes that already fit without changing font size", () => {
    const shrink = parseSvg('<svg><text id="target" font-size="12">Old</text></svg>');
    const truncate = parseSvg('<svg><text id="target" font-size="12">Old</text></svg>');
    const error = parseSvg('<svg><text id="target" font-size="12">Old</text></svg>');

    expect(
      applyTextMapping(shrink, row({ name: "A" }), mapping({ fit: "shrink" }), metrics),
    ).toEqual([]);
    expect(
      applyTextMapping(truncate, row({ name: "A" }), mapping({ fit: "truncate" }), metrics),
    ).toEqual([]);
    expect(
      applyTextMapping(error, row({ name: "A" }), mapping({ fit: "error" }), metrics),
    ).toEqual([]);
    expect(shrink.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "12",
    );
    expect(truncate.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "12",
    );
    expect(error.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "12",
    );
  });

  it("shrinks text proportionally and respects a fitting minimum", () => {
    const exact = parseSvg('<svg><text id="target">Old</text></svg>');
    const minimum = parseSvg('<svg><text id="target">Old</text></svg>');

    expect(
      applyTextMapping(
        exact,
        row({ name: "hello" }),
        mapping({ fit: "shrink", minFontSize: 3 }),
        metrics,
      ),
    ).toEqual([]);
    expect(exact.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "4",
    );
    expect(
      applyTextMapping(
        minimum,
        row({ name: "hello" }),
        mapping({ fit: "shrink", minFontSize: 5 }),
        metrics,
      )[0],
    ).toMatchObject({ code: "text-overflow" });
    expect(minimum.getElementsByTagName("text")[0].textContent).toBe("hello");
    expect(minimum.getElementsByTagName("text")[0].getAttribute("font-size")).toBe(
      "5",
    );
  });

  it("truncates with Unicode-safe prefixes and handles an oversized ellipsis", () => {
    const unicode = parseSvg('<svg><text id="target">Old</text></svg>');
    const empty = parseSvg('<svg><text id="target">Old</text></svg>');

    expect(
      applyTextMapping(
        unicode,
        row({ name: "A😀BC" }),
        mapping({ fit: "truncate" }),
        metrics,
      ),
    ).toEqual([]);
    expect(unicode.getElementsByTagName("text")[0].textContent).toBe("A…");
    expect(
      applyTextMapping(
        empty,
        row({ name: "hello" }),
        mapping({ fit: "truncate" }),
        () => ({ ...metrics({} as Element)!, availableWidth: 5 }),
      ),
    ).toEqual([]);
    expect(empty.getElementsByTagName("text")[0].textContent).toBe("");
  });

  it("reports error-mode overflow after applying the full text", () => {
    const fit = parseSvg('<svg><text id="target">Old</text></svg>');
    const overflow = parseSvg('<svg><text id="target">Old</text></svg>');

    expect(
      applyTextMapping(fit, row({ name: "A" }), mapping({ fit: "error" }), metrics),
    ).toEqual([]);
    expect(
      applyTextMapping(
        overflow,
        row({ name: "hello" }),
        mapping({ fit: "error" }),
        metrics,
      )[0],
    ).toMatchObject({ code: "text-overflow" });
    expect(overflow.getElementsByTagName("text")[0].textContent).toBe("hello");
  });

  it("reports unavailable metrics without changing the target", () => {
    const noProvider = parseSvg('<svg><text id="target">Old</text></svg>');
    const invalid = parseSvg('<svg><text id="target">Old</text></svg>');
    const invalidMeasure = parseSvg('<svg><text id="target">Old</text></svg>');
    const providerThrows = parseSvg('<svg><text id="target">Old</text></svg>');
    const measureThrows = parseSvg('<svg><text id="target">Old</text></svg>');

    expect(
      applyTextMapping(noProvider, row({ name: "Ada" }), mapping({ fit: "shrink" }))[0],
    ).toMatchObject({ code: "text-measurement-unavailable" });
    expect(
      applyTextMapping(
        invalidMeasure,
        row({ name: "Ada" }),
        mapping({ fit: "shrink" }),
        () => ({ availableWidth: 20, fontSize: 10, measure: () => -1 }),
      )[0],
    ).toMatchObject({ code: "text-measurement-unavailable" });
    expect(
      applyTextMapping(
        invalid,
        row({ name: "Ada" }),
        mapping({ fit: "shrink" }),
        () => ({ availableWidth: Infinity, fontSize: 10, measure: () => 1 }),
      )[0],
    ).toMatchObject({ code: "text-measurement-unavailable" });
    expect(
      applyTextMapping(
        providerThrows,
        row({ name: "Ada" }),
        mapping({ fit: "shrink" }),
        () => {
          throw new Error("unavailable");
        },
      )[0],
    ).toMatchObject({ code: "text-measurement-unavailable" });
    expect(
      applyTextMapping(
        measureThrows,
        row({ name: "Ada" }),
        mapping({ fit: "shrink" }),
        () => ({
          availableWidth: 20,
          fontSize: 10,
          measure: () => {
            throw new Error("unavailable");
          },
        }),
      )[0],
    ).toMatchObject({ code: "text-measurement-unavailable" });
    [
      noProvider,
      invalid,
      invalidMeasure,
      providerThrows,
      measureThrows,
    ].forEach((svg) => {
      expect(svg.getElementsByTagName("text")[0].textContent).toBe("Old");
    });
  });
});
