import { describe, expect, it } from "vitest";
import {
  groupMappingSchema,
  imageMappingSchema,
  mappingSchema,
  mappingsSchema,
  qrMappingSchema,
  textMappingSchema,
  visibilityMappingSchema,
} from "./schema";

const baseMapping = {
  id: " mapping-1 ",
  targetId: " target-1 ",
  columnId: " column-1 ",
};

describe("mapping schemas", () => {
  it("parses every documented mapping variant", () => {
    expect(
      textMappingSchema.parse({
        ...baseMapping,
        type: "text",
        fit: "shrink",
        minFontSize: 8,
      }),
    ).toEqual({
      id: "mapping-1",
      targetId: "target-1",
      columnId: "column-1",
      type: "text",
      fit: "shrink",
      minFontSize: 8,
    });
    expect(
      visibilityMappingSchema.parse({
        ...baseMapping,
        type: "visibility",
        trueValues: ["yes"],
        falseValues: ["no"],
        emptyBehavior: "hide",
        required: true,
      }),
    ).toMatchObject({ type: "visibility", required: true });
    expect(
      groupMappingSchema.parse({
        ...baseMapping,
        type: "exclusive-group",
        match: "data-option",
        emptyBehavior: "hide-all",
      }),
    ).toMatchObject({ type: "exclusive-group", match: "data-option" });
    expect(
      qrMappingSchema.parse({
        ...baseMapping,
        type: "qr",
        errorCorrection: "H",
        marginModules: 0,
        emptyBehavior: "error",
      }),
    ).toMatchObject({ type: "qr", errorCorrection: "H" });
    expect(
      imageMappingSchema.parse({
        ...baseMapping,
        type: "image",
        fit: "cover",
        emptyBehavior: "keep-template",
      }),
    ).toMatchObject({ type: "image", fit: "cover" });
  });

  it("keeps required optional without applying a default", () => {
    expect(
      textMappingSchema.parse({
        ...baseMapping,
        type: "text",
        fit: "keep",
      }),
    ).not.toHaveProperty("required");
  });

  it.each(["id", "targetId", "columnId"])(
    "rejects blank %s values",
    (key) => {
      expect(
        mappingSchema.safeParse({
          ...baseMapping,
          [key]: "   ",
          type: "text",
          fit: "keep",
        }).success,
      ).toBe(false);
    },
  );

  it("rejects non-string identifiers", () => {
    expect(
      mappingSchema.safeParse({
        ...baseMapping,
        id: 1,
        type: "text",
        fit: "keep",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid mapping discriminators and enum options", () => {
    const validText = { ...baseMapping, type: "text", fit: "keep" };
    expect(mappingSchema.safeParse({ ...validText, type: "unknown" }).success).toBe(
      false,
    );
    expect(mappingSchema.safeParse({ ...validText, fit: "wrap" }).success).toBe(
      false,
    );
    expect(
      mappingSchema.safeParse({
        ...baseMapping,
        type: "visibility",
        trueValues: [],
        falseValues: [],
        emptyBehavior: "ignore",
      }).success,
    ).toBe(false);
    expect(
      mappingSchema.safeParse({
        ...baseMapping,
        type: "exclusive-group",
        match: "class",
        emptyBehavior: "hide-all",
      }).success,
    ).toBe(false);
    expect(
      mappingSchema.safeParse({
        ...baseMapping,
        type: "qr",
        errorCorrection: "X",
        marginModules: 1,
        emptyBehavior: "hide",
      }).success,
    ).toBe(false);
    expect(
      mappingSchema.safeParse({
        ...baseMapping,
        type: "image",
        fit: "tile",
        emptyBehavior: "hide",
      }).success,
    ).toBe(false);
  });

  it("enforces documented numeric bounds", () => {
    expect(
      textMappingSchema.safeParse({
        ...baseMapping,
        type: "text",
        fit: "keep",
        minFontSize: 0,
      }).success,
    ).toBe(false);
    expect(
      qrMappingSchema.safeParse({
        ...baseMapping,
        type: "qr",
        errorCorrection: "L",
        marginModules: -1,
        emptyBehavior: "hide",
      }).success,
    ).toBe(false);
    expect(
      qrMappingSchema.safeParse({
        ...baseMapping,
        type: "qr",
        errorCorrection: "L",
        marginModules: 1.5,
        emptyBehavior: "hide",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown mapping keys and validates mapping arrays", () => {
    const mapping = { ...baseMapping, type: "text", fit: "keep" };
    expect(mappingSchema.safeParse({ ...mapping, unexpected: true }).success).toBe(
      false,
    );
    expect(mappingsSchema.parse([mapping])).toHaveLength(1);
  });
});
