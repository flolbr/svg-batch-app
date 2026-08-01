import {
  importSpreadsheet,
  type ImportedSpreadsheet,
} from "../data/importSpreadsheet";
import { loadEmbeddedProject } from "../project/loadProject";
import type { Project } from "../project/projectSchema";
import { importSvgFile, type ImportedSvg } from "../svg/importSvg";

export type ImportedDriveFile =
  | { kind: "svg"; svg: ImportedSvg }
  | { kind: "spreadsheet"; spreadsheet: ImportedSpreadsheet }
  | { kind: "project"; project: Project };

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function importDriveFile(file: File): Promise<ImportedDriveFile> {
  const fileExtension = extension(file.name);
  if (file.type === "image/svg+xml" || fileExtension === "svg") {
    return {
      kind: "svg",
      svg: { ...(await importSvgFile(file)), sourceStatus: "drive" },
    };
  }
  if (["csv", "xls", "xlsx"].includes(fileExtension)) {
    return { kind: "spreadsheet", spreadsheet: await importSpreadsheet(file) };
  }
  if (file.type === "text/html" || fileExtension === "html") {
    const document = new DOMParser().parseFromString(
      await file.text(),
      "text/html",
    );
    const result = loadEmbeddedProject(document);
    if (!result.success) throw new Error(result.error);
    return { kind: "project", project: result.project };
  }
  throw new Error(`Unsupported Google Drive file type for “${file.name}”.`);
}
