import { describe, expect, it } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { QrMapping } from "./schema";
import { applyQrMapping } from "./qrMapping";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(value: string | undefined): SourceRow {
  return {
    id: "row-1",
    values: {},
    displayedValues: value === undefined ? {} : { value },
  };
}

function mapping(overrides: Partial<QrMapping> = {}): QrMapping {
  return {
    id: "mapping-1",
    targetId: "code",
    columnId: "value",
    type: "qr",
    errorCorrection: "M",
    marginModules: 2,
    emptyBehavior: "hide",
    ...overrides,
  };
}

function target(svg: SVGSVGElement): Element | undefined {
  return Array.from(svg.getElementsByTagName("g")).find(
    (element) => element.getAttribute("id") === "code",
  );
}

function boundsSvg(
  attributes = 'x="10" y="20" width="40" height="20"',
): string {
  return `<svg><g id="code" transform="scale(2)" data-note="keep" display="none"><rect ${attributes}/><circle/></g></svg>`;
}

describe("applyQrMapping", () => {
  it("replaces target children with vector QR output and preserves target attributes", () => {
    const svg = parseSvg(boundsSvg());

    expect(applyQrMapping(svg, row("https://example.test"), mapping())).toEqual(
      [],
    );
    const code = target(svg)!;
    const output = code.firstElementChild!;
    expect(code.getAttribute("id")).toBe("code");
    expect(code.getAttribute("transform")).toBe("scale(2)");
    expect(code.getAttribute("data-note")).toBe("keep");
    expect(code.hasAttribute("display")).toBe(false);
    expect(output.localName).toBe("g");
    expect(output.getAttribute("transform")).toContain("translate(20 20)");
    expect(output.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(output.children).toHaveLength(2);
    expect(output.children[0].getAttribute("fill")).toBe("white");
    expect(output.children[1].localName).toBe("path");
    expect(output.children[1].getAttribute("fill")).toBe("black");
    expect(output.children[1].getAttribute("d")).toMatch(/^M\d+ \d+h1v1h-1z/);
    expect(code.getElementsByTagName("image")).toHaveLength(0);
  });

  it("centers square output and changes its scale for margins", () => {
    const withoutMargin = parseSvg(boundsSvg());
    const withMargin = parseSvg(boundsSvg());

    applyQrMapping(withoutMargin, row("Ada"), mapping({ marginModules: 0 }));
    applyQrMapping(withMargin, row("Ada"), mapping({ marginModules: 4 }));
    const first = target(withoutMargin)?.firstElementChild;
    const second = target(withMargin)?.firstElementChild;
    expect(first?.getAttribute("transform")).toContain("translate(20 20)");
    expect(second?.getAttribute("transform")).toContain("translate(20 20)");
    expect(first?.getAttribute("transform")).not.toBe(
      second?.getAttribute("transform"),
    );
  });

  it("uses the configured error-correction level", () => {
    const low = parseSvg(boundsSvg());
    const high = parseSvg(boundsSvg());

    applyQrMapping(
      low,
      row("membership-123"),
      mapping({ errorCorrection: "L" }),
    );
    applyQrMapping(
      high,
      row("membership-123"),
      mapping({ errorCorrection: "H" }),
    );
    expect(low.getElementsByTagName("path")[0].getAttribute("d")).not.toBe(
      high.getElementsByTagName("path")[0].getAttribute("d"),
    );
  });

  it("handles empty hide, error, and required paths", () => {
    const hide = parseSvg(boundsSvg());
    const error = parseSvg(boundsSvg());
    const required = parseSvg(boundsSvg());

    expect(applyQrMapping(hide, row(" "), mapping())).toEqual([]);
    expect(target(hide)?.getAttribute("display")).toBe("none");
    expect(target(hide)?.children).toHaveLength(2);
    expect(
      applyQrMapping(error, row(""), mapping({ emptyBehavior: "error" }))[0],
    ).toMatchObject({ code: "empty-value" });
    expect(
      applyQrMapping(required, row(""), mapping({ required: true }))[0],
    ).toMatchObject({ code: "required-value" });
    expect(target(error)?.children).toHaveLength(2);
    expect(target(required)?.children).toHaveLength(2);
  });

  it("reports invalid bounds without changing the target", () => {
    const missing = parseSvg('<svg><g id="code"><circle/></g></svg>');
    const invalid = parseSvg(boundsSvg('width="0" height="20"'));

    expect(applyQrMapping(missing, row("Ada"), mapping())[0]).toMatchObject({
      code: "invalid-bounds",
    });
    expect(applyQrMapping(invalid, row("Ada"), mapping())[0]).toMatchObject({
      code: "invalid-bounds",
    });
    expect(missing.getElementsByTagName("circle")).toHaveLength(1);
    expect(invalid.getElementsByTagName("rect")).toHaveLength(1);
  });

  it("reports missing references and incompatible targets", () => {
    const column = parseSvg(boundsSvg());
    const missing = parseSvg('<svg><g id="other"/></svg>');
    const incompatible = parseSvg('<svg><rect id="code"/></svg>');

    expect(applyQrMapping(column, row(undefined), mapping())[0]).toMatchObject({
      code: "missing-column",
    });
    expect(applyQrMapping(missing, row("Ada"), mapping())[0]).toMatchObject({
      code: "missing-target",
    });
    expect(
      applyQrMapping(incompatible, row("Ada"), mapping())[0],
    ).toMatchObject({ code: "incompatible-target" });
  });

  it("reports QR generation errors without changing the target", () => {
    const svg = parseSvg(boundsSvg());

    expect(
      applyQrMapping(svg, row("a".repeat(10000)), mapping())[0],
    ).toMatchObject({ code: "qr-generation-failed" });
    expect(target(svg)?.getElementsByTagName("rect")).toHaveLength(1);
  });

  it("uses special-character IDs and isolates caller clones", () => {
    const source = parseSvg(
      '<svg><g id="code.with[1]"><rect width="20" height="20"/></g></svg>',
    );
    const clone = source.cloneNode(true) as SVGSVGElement;

    expect(
      applyQrMapping(clone, row("Ada"), mapping({ targetId: "code.with[1]" })),
    ).toEqual([]);
    expect(clone.getElementsByTagName("path")).toHaveLength(1);
    expect(source.getElementsByTagName("path")).toHaveLength(0);
    expect(source.getElementsByTagName("rect")).toHaveLength(1);
  });
});
