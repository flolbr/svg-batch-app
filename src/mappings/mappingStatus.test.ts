import { describe, expect, it } from "vitest";
import {
  getMappingStatus,
  mappingTypesForTarget,
} from "./mappingStatus";

const target = { id: "target-1", tagName: "text" };
const columnIds = new Set(["name"]);

const textMapping = {
  id: "mapping-1",
  targetId: "target-1",
  columnId: "name",
  type: "text" as const,
  fit: "keep" as const,
};

describe("mappingTypesForTarget", () => {
  it.each([
    ["text", ["text", "visibility"]],
    ["TSPAN", ["text", "visibility"]],
    ["g", ["exclusive-group", "qr", "visibility"]],
    ["G", ["exclusive-group", "qr", "visibility"]],
    ["image", ["image", "visibility"]],
    ["IMAGE", ["image", "visibility"]],
    ["path", ["visibility"]],
  ] as const)("returns compatible mapping types for %s", (tagName, types) => {
    expect(mappingTypesForTarget(tagName)).toEqual(types);
  });

  it("returns a fresh array", () => {
    const types = mappingTypesForTarget("text");
    types.pop();

    expect(mappingTypesForTarget("text")).toEqual(["text", "visibility"]);
  });
});

describe("getMappingStatus", () => {
  it("reports an unmapped target", () => {
    expect(getMappingStatus(target, undefined, columnIds)).toEqual({
      kind: "unmapped",
      label: "Unmapped",
      message: "No mapping configured.",
    });
  });

  it("reports the first schema error for invalid mappings", () => {
    expect(
      getMappingStatus(target, { ...textMapping, fit: "wrap" }, columnIds),
    ).toEqual({
      kind: "error",
      label: "Error",
      message: "Invalid option: expected one of \"keep\"|\"shrink\"|\"truncate\"|\"error\"",
    });
  });

  it("reports mappings assigned to a different target", () => {
    expect(
      getMappingStatus(
        target,
        { ...textMapping, targetId: "other-target" },
        columnIds,
      ),
    ).toEqual({
      kind: "error",
      label: "Error",
      message: "Mapping targets a different SVG object.",
    });
  });

  it("reports incompatible mapping types", () => {
    expect(
      getMappingStatus(
        { ...target, tagName: "image" },
        textMapping,
        columnIds,
      ),
    ).toEqual({
      kind: "error",
      label: "Error",
      message: "Mapping type is incompatible with this SVG object.",
    });
  });

  it("warns when the mapped column is unavailable", () => {
    expect(
      getMappingStatus(target, { ...textMapping, columnId: "missing" }, columnIds),
    ).toEqual({
      kind: "warning",
      label: "Warning",
      message: 'Spreadsheet column "missing" is unavailable in this worksheet.',
    });
  });

  it("reports valid mappings as mapped", () => {
    expect(getMappingStatus(target, textMapping, columnIds)).toEqual({
      kind: "mapped",
      label: "Mapped",
      message: "Mapping configuration is valid.",
    });
  });
});
