import type { DataColumn, SourceRow } from "../data/normalizeWorkbook";

export type SelectedDataCsvFile = {
  filename: "selected-data.csv";
  content: string;
  mimeType: "text/csv;charset=utf-8";
};

const utf8Bom = "\uFEFF";

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function createSelectedDataCsv(
  columns: readonly DataColumn[],
  rows: readonly SourceRow[],
): SelectedDataCsvFile {
  if (columns.length === 0) {
    return {
      filename: "selected-data.csv",
      content: utf8Bom,
      mimeType: "text/csv;charset=utf-8",
    };
  }

  const records = [
    columns.map((column) => escapeCsvField(column.displayName)).join(","),
    ...rows.map((row) =>
      columns
        .map((column) => escapeCsvField(row.displayedValues[column.id] ?? ""))
        .join(","),
    ),
  ];

  return {
    filename: "selected-data.csv",
    content: `${utf8Bom}${records.join("\r\n")}\r\n`,
    mimeType: "text/csv;charset=utf-8",
  };
}
