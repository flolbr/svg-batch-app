import { describe, expect, it } from "vitest";
import type { Mapping } from "../mappings/schema";
import {
  validateExternalResources,
  validateMappingConfiguration,
} from "./validationRules";

function parseSvg(source: string): SVGSVGElement {
  return new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("validateMappingConfiguration", () => {
  it("returns valid mappings and reports project issues once in mapping order", () => {
    const template = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <text id="name"/>
        <image id="photo" width="10" height="10"/>
        <path id="shape"/>
      </svg>
    `);
    const mappings: Mapping[] = [
      {
        id: "valid",
        targetId: "shape",
        columnId: "show",
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "error",
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
      {
        id: "missing-both",
        targetId: "also-gone",
        columnId: "also-missing",
        type: "image",
        fit: "contain",
        emptyBehavior: "error",
      },
    ];

    const result = validateMappingConfiguration(
      template,
      new Set(["show", "name"]),
      mappings,
    );

    expect(result.applicableMappings).toEqual([mappings[0]]);
    expect(
      result.issues.map((issue) => [
        issue.mappingId,
        issue.code,
        issue.rowId,
      ]),
    ).toEqual([
      ["missing-column", "missing-column", undefined],
      ["missing-target", "missing-target", undefined],
      ["incompatible", "incompatible-target", undefined],
      ["missing-both", "missing-column", undefined],
      ["missing-both", "missing-target", undefined],
    ]);
    expect(mappings).toHaveLength(5);
  });
});

describe("validateExternalResources", () => {
  it("allows local fragments and embedded data while reporting external references", () => {
    const svg = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" id="root">
        <defs><linearGradient id="gradient"/></defs>
        <rect id="safe" fill="url(#gradient)"/>
        <image id="embedded" href="data:image/png;base64,abc"/>
        <image id="remote" href="https://example.com/photo.png"/>
        <image id="blob" href="blob:generated-photo"/>
        <use id="relative" href="asset.svg#shape"/>
        <rect id="styled" style="fill:url('https://example.com/fill.svg')"/>
      </svg>
    `);

    expect(validateExternalResources(svg, "row-1")).toEqual([
      {
        level: "error",
        code: "external-resource",
        message:
          'External resource "https://example.com/photo.png" is not embedded.',
        rowId: "row-1",
        targetId: "remote",
      },
      {
        level: "error",
        code: "external-resource",
        message: 'External resource "blob:generated-photo" is not embedded.',
        rowId: "row-1",
        targetId: "blob",
      },
      {
        level: "error",
        code: "external-resource",
        message: 'External resource "asset.svg#shape" is not embedded.',
        rowId: "row-1",
        targetId: "relative",
      },
      {
        level: "error",
        code: "external-resource",
        message:
          'External resource "https://example.com/fill.svg" is not embedded.',
        rowId: "row-1",
        targetId: "styled",
      },
    ]);
  });

  it("reports a repeated external URL once per SVG element", () => {
    const svg = parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg">
        <rect id="shape"
          fill="url(https://example.com/a.svg)"
          stroke="url(https://example.com/a.svg)"/>
      </svg>
    `);

    expect(validateExternalResources(svg, "row-2")).toHaveLength(1);
  });
});
