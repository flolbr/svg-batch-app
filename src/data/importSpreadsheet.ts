import * as XLSX from "xlsx";

const supportedExtensions = new Set(["csv", "xlsx", "xls"]);

export type ImportedSpreadsheet = {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  workbook: XLSX.WorkBook;
};

function getExtension(fileName: string): string | undefined {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName
    ? extension.toLowerCase()
    : undefined;
}

export async function importSpreadsheet(
  file: File,
): Promise<ImportedSpreadsheet> {
  const extension = getExtension(file.name);

  if (!extension || !supportedExtensions.has(extension)) {
    const type = extension ? `.${extension}` : "this file type";
    throw new Error(
      `Unsupported spreadsheet file type (${type}). Choose a CSV, XLSX, or XLS file.`,
    );
  }

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, {
      raw: extension === "csv",
      type: "array",
    });

    if (workbook.SheetNames.length === 0) {
      throw new Error("No worksheets were found.");
    }

    return {
      fileName: file.name,
      fileSize: file.size,
      sheetNames: workbook.SheetNames,
      workbook,
    };
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(`Could not read spreadsheet "${file.name}".${detail}`);
  }
}
