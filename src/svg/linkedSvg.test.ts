import { describe, expect, it, vi } from "vitest";
import { compareTemplateMappings, sha256 } from "./linkedSvg";

const svg = (targets: Array<[string, string]>) => ({
  fileName: "card.svg",
  fileSize: 1,
  acceptedSvg: "<svg />",
  sourceStatus: "embedded" as const,
  tree: [],
  targets: targets.map(([id, tagName]) => ({ id, tagName })),
});

describe("compareTemplateMappings", () => {
  it("keeps compatible mappings and reports missing, incompatible, and new objects", () => {
    const result = compareTemplateMappings(
      svg([
        ["name", "text"],
        ["old", "g"],
      ]),
      svg([
        ["name", "text"],
        ["old", "image"],
        ["new", "g"],
      ]),
      [
        {
          id: "name-map",
          targetId: "name",
          columnId: "name",
          type: "text",
          fit: "keep",
        },
        {
          id: "old-map",
          targetId: "old",
          columnId: "visible",
          type: "exclusive-group",
          match: "data-option",
          emptyBehavior: "error",
        },
        {
          id: "gone-map",
          targetId: "gone",
          columnId: "state",
          type: "visibility",
          trueValues: ["yes"],
          falseValues: ["no"],
          emptyBehavior: "error",
        },
      ],
    );

    expect(result.preserved.map((mapping) => mapping.id)).toEqual(["name-map"]);
    expect(result.missingTargetIds).toEqual(["gone"]);
    expect(result.incompatibleTargetIds).toEqual(["old"]);
    expect(result.newTargetIds).toEqual(["new"]);
  });
});

describe("sha256", () => {
  it("hashes accepted SVG text", async () => {
    if (!crypto.subtle) vi.stubGlobal("crypto", { subtle: crypto.subtle });
    await expect(sha256("<svg />")).resolves.toBe(
      "f68e724d27d8f77658c3fefb57fba1f236c3f0592e66bfbaac3547ffdcdadc8b",
    );
  });
});
