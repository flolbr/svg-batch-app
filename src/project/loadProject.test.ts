import { describe, expect, it } from "vitest";
import { loadEmbeddedProject } from "./loadProject";
import type { Project } from "./projectSchema";

function project(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    projectId: "project-1",
    name: "Badges",
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
      createdAt: "2026-07-31T08:00:00.000Z",
      updatedAt: "2026-07-31T08:00:00.000Z",
      appVersion: "0.0.0",
    },
    ...overrides,
  };
}

function projectDocument(json?: string) {
  const testDocument = document.implementation.createHTMLDocument();

  if (json !== undefined) {
    const projectElement = testDocument.createElement("script");
    projectElement.id = "svg-batch-project";
    projectElement.type = "application/json";
    projectElement.textContent = json;
    testDocument.body.append(projectElement);
  }

  return testDocument;
}

describe("loadEmbeddedProject", () => {
  it("parses and validates the embedded project", () => {
    const result = loadEmbeddedProject(
      projectDocument(JSON.stringify(project())),
    );

    expect(result).toEqual({
      success: true,
      project: project(),
    });
  });

  it("parses validated persisted spreadsheet state", () => {
    const persistedProject = project({
      data: {
        fileName: "members.csv",
        fileSize: 24,
        sheetNames: ["Members"],
        selectedSheetName: "Members",
        worksheets: {
          Members: {
            data: { columns: [], rows: [] },
            selectedRowIds: [],
            filters: [],
            rowOverrides: [],
            manualRows: [],
            columnPreferences: { visible: [], exported: [] },
          },
        },
      },
    });

    expect(
      loadEmbeddedProject(projectDocument(JSON.stringify(persistedProject))),
    ).toEqual({
      success: true,
      project: persistedProject,
    });
  });

  it("reports a missing project block", () => {
    expect(loadEmbeddedProject(projectDocument())).toEqual({
      success: false,
      error: "Embedded project data was not found.",
    });
  });

  it("reports malformed JSON", () => {
    expect(loadEmbeddedProject(projectDocument("{"))).toEqual({
      success: false,
      error: "Embedded project data is not valid JSON.",
    });
  });

  it.each([
    [
      "unsupported versions",
      { ...project(), schemaVersion: 2 },
      "Unsupported project schema version: 2.",
    ],
    [
      "missing identity fields",
      { ...project(), projectId: "", name: "" },
      "Project ID is required. Project name is required.",
    ],
    [
      "unknown fields",
      {
        ...project(),
        unexpected: true,
      },
      'Unrecognized key: "unexpected"',
    ],
  ])("rejects %s", (_case, project, error) => {
    expect(
      loadEmbeddedProject(projectDocument(JSON.stringify(project))),
    ).toEqual({
      success: false,
      error,
    });
  });
});
