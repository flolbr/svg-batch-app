import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { importDriveFile } from "./importDriveFile";

const project = {
  schemaVersion: 1,
  projectId: "project-1",
  name: "Drive project",
  mappings: [],
  assets: [],
  exportSettings: {
    format: "svg",
    includeCsv: false,
    filenameTemplate: "row-{row}",
    collisionPolicy: "suffix",
    continueOnError: false,
  },
  sources: [],
  audit: {
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    appVersion: "0.0.0",
  },
};

describe("importDriveFile", () => {
  it("sanitizes SVG files through the local SVG importer", async () => {
    const result = await importDriveFile(
      new File(
        [
          '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Old</text></svg>',
        ],
        "badge.svg",
        { type: "image/svg+xml" },
      ),
    );
    expect(result).toMatchObject({
      kind: "svg",
      svg: { sourceStatus: "drive", fileName: "badge.svg" },
    });
  });

  it("parses exported Sheets through the spreadsheet importer", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["Name"], ["Ada"]]),
      "Members",
    );
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const result = await importDriveFile(
      new File([bytes], "Members.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    expect(result).toMatchObject({
      kind: "spreadsheet",
      spreadsheet: { fileName: "Members.xlsx", sheetNames: ["Members"] },
    });
  });

  it("validates project HTML through the embedded project loader", async () => {
    const result = await importDriveFile(
      new File(
        [
          `<!doctype html><script id="svg-batch-project" type="application/json">${JSON.stringify(project)}</script>`,
        ],
        "project.html",
        { type: "text/html" },
      ),
    );
    expect(result).toEqual({ kind: "project", project });
  });

  it("rejects unsupported and invalid project files", async () => {
    await expect(
      importDriveFile(new File(["x"], "notes.txt", { type: "text/plain" })),
    ).rejects.toThrow("Unsupported Google Drive file type");
    await expect(
      importDriveFile(
        new File(["<html></html>"], "bad.html", { type: "text/html" }),
      ),
    ).rejects.toThrow("Embedded project data was not found");
  });
});
