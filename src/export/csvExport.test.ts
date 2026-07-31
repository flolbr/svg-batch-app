import { describe, expect, it } from "vitest";
import type { DataColumn, SourceRow } from "../data/normalizeWorkbook";
import { createSelectedDataCsv } from "./csvExport";

const columns: readonly DataColumn[] = [
  {
    id: "col-name",
    sourceHeader: "Name",
    displayName: "Name",
    sourceIndex: 0,
    inferredType: "text",
  },
  {
    id: "col-code",
    sourceHeader: "Code",
    displayName: "Code",
    sourceIndex: 1,
    inferredType: "text",
  },
];

function row(id: string, displayedValues: Record<string, string>): SourceRow {
  return { id, values: {}, displayedValues };
}

describe("createSelectedDataCsv", () => {
  it("returns only a UTF-8 BOM when no columns are selected", () => {
    expect(createSelectedDataCsv([], [])).toEqual({
      filename: "selected-data.csv",
      content: "\uFEFF",
      mimeType: "text/csv;charset=utf-8",
    });
  });

  it("writes a header and final CRLF when there are no selected rows", () => {
    expect(createSelectedDataCsv(columns, []).content).toBe(
      "\uFEFFName,Code\r\n",
    );
  });

  it("uses ordered displayed values, including formatted Unicode values and blank cells", () => {
    const selectedColumns = [columns[1], columns[0]] as const;
    const rows = [
      row("row-2", { "col-name": "Åsa", "col-code": "00012" }),
      row("row-1", { "col-name": "資料" }),
    ] as const;

    expect(createSelectedDataCsv(selectedColumns, rows).content).toBe(
      "\uFEFFCode,Name\r\n00012,Åsa\r\n,資料\r\n",
    );
  });

  it("quotes commas, quotes, and line breaks using standard CSV escaping", () => {
    const quotedColumns = [
      { ...columns[0], displayName: 'Name, "label"' },
    ] as const;
    const rows = [row("row-1", { "col-name": 'Ada, "Countess"\r\nLovelace' })];

    expect(createSelectedDataCsv(quotedColumns, rows).content).toBe(
      '\uFEFF"Name, ""label"""\r\n"Ada, ""Countess""\r\nLovelace"\r\n',
    );
  });

  it("does not mutate the selected columns or source rows", () => {
    const inputColumns = [{ ...columns[0] }];
    const inputRows = [row("row-1", { "col-name": "Ada" })];
    const before = structuredClone({ inputColumns, inputRows });

    createSelectedDataCsv(inputColumns, inputRows);

    expect({ inputColumns, inputRows }).toEqual(before);
  });
});
