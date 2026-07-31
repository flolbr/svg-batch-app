import { describe, expect, it, vi } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import { applyMappings } from "./applyMappings";
import type { Mapping } from "./schema";

function parseSvg(source: string): SVGSVGElement {
  return new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(displayedValues: Record<string, string>): SourceRow {
  return {
    id: "row-1",
    displayedValues,
    values: displayedValues,
  };
}

describe("applyMappings", () => {
  it("clones the template and applies every mapping type with injected dependencies", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g id="tier">
          <g id="basic" data-option="basic"/>
          <g id="premium" data-option="premium"/>
        </g>
        <rect id="badge" display="inline"/>
        <text id="name" font-size="12">Template</text>
        <image id="photo" width="80" height="60" href="data:image/png;base64,old"/>
        <g id="code"><rect x="10" y="20" width="100" height="80"/></g>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "qr",
        targetId: "code",
        columnId: "qr",
        type: "qr",
        errorCorrection: "M",
        marginModules: 2,
        emptyBehavior: "error",
      },
      {
        id: "name",
        targetId: "name",
        columnId: "name",
        type: "text",
        fit: "shrink",
        minFontSize: 6,
      },
      {
        id: "photo",
        targetId: "photo",
        columnId: "photo",
        type: "image",
        fit: "cover",
        emptyBehavior: "error",
      },
      {
        id: "badge",
        targetId: "badge",
        columnId: "show",
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "error",
      },
      {
        id: "tier",
        targetId: "tier",
        columnId: "tier",
        type: "exclusive-group",
        match: "data-option",
        emptyBehavior: "error",
      },
    ];
    const metricsProvider = vi.fn((_target: Element) => ({
      availableWidth: 30,
      fontSize: 12,
      measure: (text: string, fontSize: number) => text.length * fontSize,
    }));
    const imageValueResolver = vi.fn(() => "blob:resolved-photo");

    const result = applyMappings(
      template,
      row({
        tier: "premium",
        show: "no",
        name: "Ada",
        photo: "photo-key",
        qr: "member-1",
      }),
      mappings,
      { imageValueResolver, textMetricsProvider: metricsProvider },
    );

    expect(result.issues).toEqual([]);
    expect(result.svg).not.toBe(template);
    expect(template.querySelector("#basic")?.getAttribute("display")).toBeNull();
    expect(template.querySelector("#name")?.textContent).toBe("Template");
    expect(template.querySelector("#photo")?.getAttribute("href")).toBe(
      "data:image/png;base64,old",
    );
    expect(template.querySelector("#code")?.children.length).toBe(1);

    expect(result.svg.querySelector("#basic")?.getAttribute("display")).toBe(
      "none",
    );
    expect(
      result.svg.querySelector("#premium")?.getAttribute("display"),
    ).toBeNull();
    expect(result.svg.querySelector("#badge")?.getAttribute("display")).toBe(
      "none",
    );
    expect(result.svg.querySelector("#name")?.textContent).toBe("Ada");
    expect(result.svg.querySelector("#name")?.getAttribute("font-size")).toBe(
      "10",
    );
    expect(result.svg.querySelector("#photo")?.getAttribute("href")).toBe(
      "blob:resolved-photo",
    );
    expect(
      result.svg.querySelector("#photo")?.getAttribute("preserveAspectRatio"),
    ).toBe("xMidYMid slice");
    expect(result.svg.querySelector("#code")?.children.length).toBe(1);
    expect(result.svg.querySelector("#code > g > path")).not.toBeNull();
    expect(imageValueResolver).toHaveBeenCalledWith("photo-key");
    expect(metricsProvider).toHaveBeenCalledOnce();
    expect(metricsProvider.mock.calls[0][0]).toBe(
      result.svg.querySelector("#name"),
    );
  });

  it("applies group selection before visibility regardless of input order", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <g id="options">
          <g id="selected" data-option="selected" display="none"/>
          <g id="other" data-option="other"/>
        </g>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "hide-selected",
        targetId: "selected",
        columnId: "visible",
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "error",
      },
      {
        id: "choose-option",
        targetId: "options",
        columnId: "choice",
        type: "exclusive-group",
        match: "data-option",
        emptyBehavior: "error",
      },
    ];

    const result = applyMappings(
      template,
      row({ choice: "selected", visible: "no" }),
      mappings,
    );

    expect(result.issues).toEqual([]);
    expect(result.svg.querySelector("#selected")?.getAttribute("display")).toBe(
      "none",
    );
    expect(result.svg.querySelector("#other")?.getAttribute("display")).toBe(
      "none",
    );
  });

  it("aggregates issues in application order and continues applying valid mappings", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <rect id="visible"/>
        <text id="name">Template</text>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "text-missing-column",
        targetId: "name",
        columnId: "missing-text",
        type: "text",
        fit: "keep",
      },
      {
        id: "valid-visibility",
        targetId: "visible",
        columnId: "show",
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "error",
      },
      {
        id: "visibility-missing-column",
        targetId: "visible",
        columnId: "missing-visibility",
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "error",
      },
      {
        id: "image-missing-target",
        targetId: "photo",
        columnId: "photo",
        type: "image",
        fit: "contain",
        emptyBehavior: "error",
      },
    ];

    const result = applyMappings(
      template,
      row({ show: "no", photo: "data:image/png;base64,a" }),
      mappings,
    );

    expect(result.svg.querySelector("#visible")?.getAttribute("display")).toBe(
      "none",
    );
    expect(result.svg.querySelector("#name")?.textContent).toBe("Template");
    expect(result.issues.map((issue) => [issue.mappingId, issue.code])).toEqual(
      [
        ["visibility-missing-column", "missing-column"],
        ["text-missing-column", "missing-column"],
        ["image-missing-target", "missing-target"],
      ],
    );
  });
});
