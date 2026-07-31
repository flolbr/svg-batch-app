import { describe, expect, it } from "vitest";
import type { DataColumn, SourceRow } from "../data/normalizeWorkbook";
import { resolveExportFilenames } from "./filenameRules";

const columns: DataColumn[] = [
  {
    id: "id",
    sourceHeader: "ID",
    displayName: "Document ID",
    sourceIndex: 0,
    inferredType: "text",
  },
  {
    id: "name",
    sourceHeader: "Name",
    displayName: "Name",
    sourceIndex: 1,
    inferredType: "text",
  },
];

function row(id: string, values: Record<string, string> = {}): SourceRow {
  return { id, values, displayedValues: values };
}

function resolve(
  template: string,
  rows: readonly SourceRow[],
  collisionPolicy: "suffix" | "error" = "suffix",
) {
  return resolveExportFilenames({
    rows,
    columns,
    rowNumbers: new Map(
      rows.map((sourceRow, index) => [sourceRow.id, index + 2]),
    ),
    template,
    extension: "svg",
    collisionPolicy,
  });
}

describe("resolveExportFilenames", () => {
  it("renders row and displayed column placeholders in order", () => {
    const result = resolve("{row}-{Document ID}-{Name}", [
      row("second", { id: "A-7", name: "Caf\u00e9" }),
      row("first", { id: "B-2", name: "1,234.50" }),
    ]);

    expect(result).toEqual({
      entries: [
        {
          rowId: "second",
          requestedFilename: "2-A-7-Caf\u00e9.svg",
          actualFilename: "2-A-7-Caf\u00e9.svg",
        },
        {
          rowId: "first",
          requestedFilename: "3-B-2-1,234.50.svg",
          actualFilename: "3-B-2-1,234.50.svg",
        },
      ],
      issues: [],
    });
  });

  it("keeps requested names and sanitizes actual names", () => {
    const result = resolve(" {Name} ", [
      row("one", { name: ' a/b\\c\u0000<>:"|?*.  ' }),
    ]);
    expect(result.entries[0]).toEqual({
      rowId: "one",
      requestedFilename: '  a/b\\c\u0000<>:"|?*.   .svg',
      actualFilename: "a-b-c-.svg",
    });
  });

  it("uses untitled for blank values and makes device names safe", () => {
    expect(
      resolve("{Name}", [row("blank"), row("device", { name: "CON.txt" })])
        .entries,
    ).toEqual([
      {
        rowId: "blank",
        requestedFilename: ".svg",
        actualFilename: "untitled.svg",
      },
      {
        rowId: "device",
        requestedFilename: "CON.txt.svg",
        actualFilename: "CON-file.txt.svg",
      },
    ]);
  });

  it("caps filenames without splitting Unicode code points, including suffixes", () => {
    const long = "😀".repeat(200);
    const result = resolve("{Name}", [
      row("one", { name: long }),
      row("two", { name: long }),
    ]);
    expect(Array.from(result.entries[0].actualFilename)).toHaveLength(180);
    expect(Array.from(result.entries[1].actualFilename)).toHaveLength(180);
    expect(result.entries[0].actualFilename.endsWith(".svg")).toBe(true);
    expect(result.entries[1].actualFilename.endsWith("-2.svg")).toBe(true);
    expect(result.entries[0].actualFilename).not.toContain("\ud83d.svg");
  });

  it("allocates suffixes deterministically without stealing existing suffixed names", () => {
    expect(
      resolve("{Name}", [
        row("one", { name: "card" }),
        row("two", { name: "card-2" }),
        row("three", { name: "CARD" }),
        row("four", { name: "card" }),
      ]).entries.map((entry) => entry.actualFilename),
    ).toEqual(["card.svg", "card-2.svg", "CARD-3.svg", "card-4.svg"]);
  });

  it("reports sanitized case and NFC collisions in error mode", () => {
    const result = resolve(
      "{Name}",
      [
        row("one", { name: " caf\u00e9/ " }),
        row("two", { name: "CAFE\u0301\\" }),
      ],
      "error",
    );
    expect(result.entries.map((entry) => entry.actualFilename)).toEqual([
      "caf\u00e9-.svg",
      "CAF\u00c9-.svg",
    ]);
    expect(result.issues.map((issue) => issue.rowId)).toEqual(["one", "two"]);
    expect(
      result.issues.every((issue) => issue.code === "duplicate-filename"),
    ).toBe(true);
  });

  it("reports invalid templates once per unknown placeholder and returns fallback entries", () => {
    const result = resolve("{Missing}-{Missing}-{Name", [
      row("one", { name: "Ada" }),
      row("two", { name: "Bea" }),
    ]);
    expect(result.issues).toEqual([
      {
        level: "error",
        code: "invalid-filename-template",
        message: 'Unknown filename placeholder "Missing".',
      },
      {
        level: "error",
        code: "invalid-filename-template",
        message: "Filename template has an unmatched opening brace.",
      },
    ]);
    expect(result.entries.map((entry) => entry.requestedFilename)).toEqual([
      "--{Name.svg",
      "--{Name.svg",
    ]);
  });

  it("does not mutate its inputs", () => {
    const rows = [row("one", { name: "A" })];
    const rowNumbers = new Map([["one", 4]]);
    const before = structuredClone({
      rows,
      columns,
      rowNumbers: [...rowNumbers],
    });
    resolveExportFilenames({
      rows,
      columns,
      rowNumbers,
      template: "{Name}",
      extension: "svg",
      collisionPolicy: "suffix",
    });
    expect({ rows, columns, rowNumbers: [...rowNumbers] }).toEqual(before);
  });
});
