import { describe, expect, it } from "vitest";
import { validateDuplicateFilenames } from "./filenameValidation";

describe("validateDuplicateFilenames", () => {
  it("returns no issues for empty and unique entries", () => {
    expect(validateDuplicateFilenames([])).toEqual([]);
    expect(
      validateDuplicateFilenames([
        { rowId: "row-1", filename: "first.svg" },
        { rowId: "row-2", filename: "second.svg" },
      ]),
    ).toEqual([]);
  });

  it("ignores blank filenames", () => {
    expect(
      validateDuplicateFilenames([
        { rowId: "row-1", filename: "  " },
        { rowId: "row-2", filename: "\t" },
      ]),
    ).toEqual([]);
  });

  it("marks every exact duplicate", () => {
    expect(
      validateDuplicateFilenames([
        { rowId: "row-1", filename: "card.svg" },
        { rowId: "row-2", filename: "card.svg" },
      ]),
    ).toEqual([
      {
        level: "error",
        code: "duplicate-filename",
        rowId: "row-1",
        message: 'Filename "card.svg" is requested by multiple rows.',
      },
      {
        level: "error",
        code: "duplicate-filename",
        rowId: "row-2",
        message: 'Filename "card.svg" is requested by multiple rows.',
      },
    ]);
  });

  it("treats case and surrounding whitespace as collisions", () => {
    expect(
      validateDuplicateFilenames([
        { rowId: "row-1", filename: " Card.SVG " },
        { rowId: "row-2", filename: "card.svg" },
      ]),
    ).toMatchObject([
      { rowId: "row-1", message: 'Filename "Card.SVG" is requested by multiple rows.' },
      { rowId: "row-2", message: 'Filename "card.svg" is requested by multiple rows.' },
    ]);
  });

  it("treats NFC-equivalent Unicode filenames as collisions", () => {
    expect(
      validateDuplicateFilenames([
        { rowId: "row-1", filename: "caf\u00e9.svg" },
        { rowId: "row-2", filename: "cafe\u0301.svg" },
      ]).map((issue) => issue.rowId),
    ).toEqual(["row-1", "row-2"]);
  });

  it("preserves entry order across multiple collision groups", () => {
    expect(
      validateDuplicateFilenames([
        { rowId: "first-a", filename: "first.svg" },
        { rowId: "second-a", filename: "second.svg" },
        { rowId: "unique", filename: "unique.svg" },
        { rowId: "first-b", filename: "FIRST.svg" },
        { rowId: "second-b", filename: " second.svg " },
      ]).map((issue) => issue.rowId),
    ).toEqual(["first-a", "second-a", "first-b", "second-b"]);
  });
});
