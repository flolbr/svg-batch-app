import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { normalizeWorksheet } from "./normalizeWorkbook";

describe("normalizeWorksheet", () => {
  it("normalizes BOM-prefixed, blank, and duplicate headers", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["\uFEFF Name ", "Name", "  ", "Name"],
      ["Ada", "Lovelace", null, "Countess"],
    ]);

    const normalized = normalizeWorksheet(worksheet, () => "row-1");

    expect(normalized.columns).toEqual([
      {
        id: "col-0",
        sourceHeader: "Name",
        displayName: "Name",
        sourceIndex: 0,
        inferredType: "text",
      },
      {
        id: "col-1",
        sourceHeader: "Name",
        displayName: "Name (2)",
        sourceIndex: 1,
        inferredType: "text",
      },
      {
        id: "col-2",
        sourceHeader: "Column 3",
        displayName: "Column 3",
        sourceIndex: 2,
        inferredType: "text",
      },
      {
        id: "col-3",
        sourceHeader: "Name",
        displayName: "Name (3)",
        sourceIndex: 3,
        inferredType: "text",
      },
    ]);
  });

  it("preserves typed and formatted values, including dates and leading zeros", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Code", "Amount", "When", "Active"],
      [12, 42, 45292, true],
    ]);
    worksheet.A2!.z = "00000";
    worksheet.C2!.z = "yyyy-mm-dd";

    const normalized = normalizeWorksheet(worksheet, () => "stable-id");

    expect(normalized.rows).toEqual([
      {
        id: "stable-id",
        values: {
          "col-0": 12,
          "col-1": 42,
          "col-2": "2024-01-01T00:00:00.000Z",
          "col-3": true,
        },
        displayedValues: {
          "col-0": "00012",
          "col-1": "42",
          "col-2": "2024-01-01",
          "col-3": "TRUE",
        },
      },
    ]);
    expect(normalized.columns.map((column) => column.inferredType)).toEqual([
      "number",
      "number",
      "date",
      "boolean",
    ]);
  });

  it("converts SheetJS Date cells to stable ISO strings", () => {
    const worksheet = XLSX.utils.aoa_to_sheet(
      [["When"], [new Date("2024-03-04T05:06:07.000Z")]],
      { cellDates: true },
    );

    const normalized = normalizeWorksheet(worksheet, () => "row-1");

    expect(worksheet.A2?.v).toBeInstanceOf(Date);
    expect(normalized.rows[0].values["col-0"]).toBe(
      (worksheet.A2!.v as Date).toISOString(),
    );
    expect(normalized.columns[0].inferredType).toBe("date");
  });

  it("infers mixed columns and defaults blank columns to text", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Mixed", "Empty"],
      [1, null],
      ["two", null],
    ]);

    const normalized = normalizeWorksheet(
      worksheet,
      (() => {
        let id = 0;
        return () => `row-${++id}`;
      })(),
    );

    expect(normalized.columns.map((column) => column.inferredType)).toEqual([
      "mixed",
      "text",
    ]);
    expect(normalized.rows).toHaveLength(2);
    expect(normalized.rows.map((row) => row.id)).toEqual(["row-1", "row-2"]);
  });

  it("keeps blank rows inside the worksheet range", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Name"],
      ["Ada"],
      [],
      ["Grace"],
    ]);

    const normalized = normalizeWorksheet(
      worksheet,
      (() => {
        let id = 0;
        return () => `row-${++id}`;
      })(),
    );

    expect(normalized.rows.map((row) => row.values["col-0"])).toEqual([
      "Ada",
      null,
      "Grace",
    ]);
    expect(normalized.rows[1].displayedValues["col-0"]).toBe("");
  });

  it("returns no columns or rows for an empty worksheet", () => {
    expect(normalizeWorksheet({})).toEqual({ columns: [], rows: [] });
  });
});
