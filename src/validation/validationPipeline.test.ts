import { describe, expect, it, vi } from "vitest";
import type { SourceRow } from "../data/normalizeWorkbook";
import type { Mapping } from "../mappings/schema";
import { validateRows } from "./validationPipeline";

function parseSvg(source: string): SVGSVGElement {
  return new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

function row(id: string, displayedValues: Record<string, string>): SourceRow {
  return { id, displayedValues, values: displayedValues };
}

describe("validateRows", () => {
  it("uses one mapping path for single-row preview and multi-row export", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <text id="name">Template</text>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "name-mapping",
        targetId: "name",
        columnId: "name",
        type: "text",
        fit: "keep",
      },
    ];
    const rows = [
      row("row-1", { name: "Ada" }),
      row("row-2", { name: "Grace" }),
    ];

    const preview = validateRows({
      template,
      rows: [rows[0]],
      mappings,
      columnIds: new Set(["name"]),
    });
    const batch = validateRows({
      template,
      rows,
      mappings,
      columnIds: new Set(["name"]),
    });

    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].svg.querySelector("#name")?.textContent).toBe("Ada");
    expect(batch.rows.map((result) => result.rowId)).toEqual([
      "row-1",
      "row-2",
    ]);
    expect(
      batch.rows.map(
        (result) => result.svg.querySelector("#name")?.textContent,
      ),
    ).toEqual(["Ada", "Grace"]);
    expect(batch.rows[0].svg).not.toBe(batch.rows[1].svg);
    expect(template.querySelector("#name")?.textContent).toBe("Template");
    expect(preview.projectIssues).toEqual([]);
    expect(batch.projectIssues).toEqual([]);
    expect(preview.issues).toEqual([]);
    expect(batch.issues).toEqual([]);
    expect(batch.hasErrors).toBe(false);
  });

  it("keeps row issues attached and aggregates them in row order", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <text id="name">Template</text>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "name-mapping",
        targetId: "name",
        columnId: "name",
        type: "text",
        fit: "keep",
        required: true,
      },
    ];

    const result = validateRows({
      template,
      rows: [
        row("missing", {}),
        row("blank", { name: " " }),
        row("valid", { name: "Ada" }),
      ],
      mappings,
      columnIds: new Set(["name"]),
    });

    expect(result.rows.map((validated) => validated.issues.length)).toEqual([
      1, 1, 0,
    ]);
    expect(result.issues.map((issue) => [issue.rowId, issue.code])).toEqual([
      ["missing", "missing-column"],
      ["blank", "required-value"],
    ]);
    expect(result.rows[2].svg.querySelector("#name")?.textContent).toBe("Ada");
    expect(result.hasErrors).toBe(true);
  });

  it("passes shared mapping dependencies through every row", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <image id="photo" width="80" height="60"/>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "photo-mapping",
        targetId: "photo",
        columnId: "photo",
        type: "image",
        fit: "contain",
        emptyBehavior: "error",
      },
    ];
    const imageValueResolver = vi.fn(
      (value: string) => `blob:resolved-${value}`,
    );

    const result = validateRows({
      template,
      rows: [row("row-1", { photo: "one" }), row("row-2", { photo: "two" })],
      mappings,
      columnIds: new Set(["photo"]),
      mappingOptions: { imageValueResolver },
    });

    expect(imageValueResolver.mock.calls).toEqual([["one"], ["two"]]);
    expect(
      result.rows.map((validated) =>
        validated.svg.querySelector("#photo")?.getAttribute("href"),
      ),
    ).toEqual(["blob:resolved-one", "blob:resolved-two"]);
  });

  it("returns an empty successful result when there are no rows", () => {
    const result = validateRows({
      template: parseSvg('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      rows: [],
      mappings: [],
      columnIds: new Set(),
    });

    expect(result).toEqual({
      rows: [],
      projectIssues: [],
      issues: [],
      hasErrors: false,
    });
  });

  it("reports mapping configuration problems once and skips those mappings", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <text id="name">Template</text>
        <image id="photo" width="10" height="10"/>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "valid",
        targetId: "name",
        columnId: "name",
        type: "text",
        fit: "keep",
      },
      {
        id: "missing-column",
        targetId: "name",
        columnId: "missing",
        type: "text",
        fit: "keep",
      },
      {
        id: "missing-target",
        targetId: "gone",
        columnId: "name",
        type: "text",
        fit: "keep",
      },
      {
        id: "incompatible",
        targetId: "photo",
        columnId: "name",
        type: "text",
        fit: "keep",
      },
    ];

    const result = validateRows({
      template,
      rows: [row("row-1", { name: "Ada" }), row("row-2", { name: "Grace" })],
      mappings,
      columnIds: new Set(["name"]),
    });

    expect(
      result.projectIssues.map((issue) => [issue.mappingId, issue.code]),
    ).toEqual([
      ["missing-column", "missing-column"],
      ["missing-target", "missing-target"],
      ["incompatible", "incompatible-target"],
    ]);
    expect(result.rows.map((validated) => validated.issues)).toEqual([[], []]);
    expect(
      result.rows.map(
        (validated) => validated.svg.querySelector("#name")?.textContent,
      ),
    ).toEqual(["Ada", "Grace"]);
    expect(result.issues).toEqual(result.projectIssues);
    expect(result.hasErrors).toBe(true);
  });

  it("preserves row mapping issues and checks generated SVG resources", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <path id="visible"/>
        <text id="required">Template</text>
        <text id="overflow">Template</text>
        <image id="photo" width="10" height="10"/>
      </svg>
    `);
    const result = validateRows({
      template,
      rows: [
        row("row-1", {
          visible: "maybe",
          required: " ",
          overflow: "Too wide",
          photo: "remote-photo",
        }),
      ],
      mappings: [
        {
          id: "visible",
          targetId: "visible",
          columnId: "visible",
          type: "visibility",
          trueValues: ["yes"],
          falseValues: ["no"],
          emptyBehavior: "error",
        },
        {
          id: "required",
          targetId: "required",
          columnId: "required",
          type: "text",
          fit: "keep",
          required: true,
        },
        {
          id: "overflow",
          targetId: "overflow",
          columnId: "overflow",
          type: "text",
          fit: "error",
        },
        {
          id: "photo",
          targetId: "photo",
          columnId: "photo",
          type: "image",
          fit: "contain",
          emptyBehavior: "error",
        },
      ],
      columnIds: new Set(["visible", "required", "overflow", "photo"]),
      mappingOptions: {
        imageValueResolver: () => "https://example.com/photo.png",
        textMetricsProvider: () => ({
          availableWidth: 1,
          fontSize: 10,
          measure: (text) => text.length * 10,
        }),
      },
    });

    expect(result.projectIssues).toEqual([]);
    expect(result.rows[0].issues.map((issue) => issue.code)).toEqual([
      "unknown-value",
      "required-value",
      "text-overflow",
      "external-resource",
    ]);
    expect(result.issues).toEqual(result.rows[0].issues);
  });

  it("attaches duplicate filename issues to their rows and aggregates them", () => {
    const result = validateRows({
      template: parseSvg('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      rows: [row("row-1", {}), row("row-2", {}), row("row-3", {})],
      mappings: [],
      columnIds: new Set(),
      requestedFilenames: [
        { rowId: "row-1", filename: "Card.svg" },
        { rowId: "row-2", filename: " card.SVG " },
        { rowId: "row-3", filename: "unique.svg" },
      ],
    });

    expect(
      result.rows.map((validated) =>
        validated.issues.map((issue) => issue.code),
      ),
    ).toEqual([["duplicate-filename"], ["duplicate-filename"], []]);
    expect(result.issues.map((issue) => issue.rowId)).toEqual([
      "row-1",
      "row-2",
    ]);
    expect(result.hasErrors).toBe(true);
  });
});
