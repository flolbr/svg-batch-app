/// <reference types="node" />

import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importSpreadsheet } from "./importSpreadsheet";
import { normalizeWorksheet } from "./normalizeWorkbook";

function spreadsheetFile(
  name: string,
  bytes: ArrayBuffer | Uint8Array,
): File {
  const source = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const data = new ArrayBuffer(source.byteLength);
  new Uint8Array(data).set(source);
  return new File([data], name);
}

function workbookFile(name: string, bookType: XLSX.BookType): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Name"], ["Ada"]]),
    "Customers",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Notes"]]),
    "Info",
  );

  return spreadsheetFile(
    name,
    XLSX.write(workbook, { bookType, type: "array" }),
  );
}

function membershipFixture(name: string): File {
  return spreadsheetFile(
    name,
    readFileSync(`docs/examples/membership-demo/${name}`),
  );
}

describe("importSpreadsheet", () => {
  it("imports a CSV file", async () => {
    const file = new File(
      ["Name,Email\nAda,ada@example.com"],
      "customers.CSV",
      {
        type: "text/csv",
      },
    );

    const result = await importSpreadsheet(file);

    expect(result.fileName).toBe("customers.CSV");
    expect(result.fileSize).toBe(file.size);
    expect(result.sheetNames).toEqual(["Sheet1"]);
    expect(
      XLSX.utils.sheet_to_json(result.workbook.Sheets.Sheet1, { header: 1 }),
    ).toEqual([
      ["Name", "Email"],
      ["Ada", "ada@example.com"],
    ]);
  });

  it.each([
    ["XLSX", "customers.xlsx", "xlsx"],
    ["XLS", "customers.xls", "biff8"],
  ] as const)("imports an %s file", async (_format, name, bookType) => {
    const result = await importSpreadsheet(workbookFile(name, bookType));

    expect(result.sheetNames).toEqual(["Customers", "Info"]);
    expect(result.workbook.Sheets.Customers).toBeDefined();
  });

  it("imports the canonical CSV fixture with its BOM and blank note cell", async () => {
    const result = await importSpreadsheet(
      membershipFixture("membership-data.csv"),
    );
    const rows = XLSX.utils.sheet_to_json<unknown[]>(
      result.workbook.Sheets.Sheet1,
      { defval: null, header: 1 },
    );

    expect(rows[0]?.[0]).toBe("Document ID");
    expect(rows[1]?.[6]).toBe("2024-05-12");
    expect(rows[8]?.[0]).toBe("DOC-008");
    expect(rows[8]?.[7]).toBeNull();
  });

  it("exposes every worksheet from the canonical XLSX fixture", async () => {
    const result = await importSpreadsheet(
      membershipFixture("membership-data.xlsx"),
    );

    expect(result.sheetNames).toEqual(["Customers", "Mapping Guide"]);
  });

  it("normalizes the canonical CSV and XLSX customer sheets equivalently", async () => {
    const [csv, xlsx] = await Promise.all([
      importSpreadsheet(membershipFixture("membership-data.csv")),
      importSpreadsheet(membershipFixture("membership-data.xlsx")),
    ]);
    let rowNumber = 0;
    const createRowId = () => `row-${++rowNumber}`;
    const normalizedCsv = normalizeWorksheet(
      csv.workbook.Sheets.Sheet1,
      createRowId,
    );
    rowNumber = 0;
    const normalizedXlsx = normalizeWorksheet(
      xlsx.workbook.Sheets.Customers,
      createRowId,
    );

    expect(normalizedCsv).toEqual(normalizedXlsx);
  });

  it("rejects unsupported file extensions", async () => {
    await expect(
      importSpreadsheet(new File(["not a spreadsheet"], "customers.txt")),
    ).rejects.toThrow(
      "Unsupported spreadsheet file type (.txt). Choose a CSV, XLSX, or XLS file.",
    );
  });

  it("reports unreadable spreadsheet files", async () => {
    await expect(
      importSpreadsheet(
        spreadsheetFile(
          "customers.xlsx",
          new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        ),
      ),
    ).rejects.toThrow('Could not read spreadsheet "customers.xlsx".');
  });
});
