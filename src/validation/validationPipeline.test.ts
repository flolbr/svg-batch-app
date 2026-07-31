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
    });
    const batch = validateRows({ template, rows, mappings });

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
    });

    expect(result).toEqual({ rows: [], issues: [], hasErrors: false });
  });
});
