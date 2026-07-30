import { describe, expect, it } from "vitest";
import { loadEmbeddedProject } from "./loadProject";

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
      projectDocument(
        JSON.stringify({
          schemaVersion: 1,
          projectId: "project-1",
          name: "Badges",
        }),
      ),
    );

    expect(result).toEqual({
      success: true,
      project: {
        schemaVersion: 1,
        projectId: "project-1",
        name: "Badges",
      },
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
      { schemaVersion: 2, projectId: "project-1", name: "Badges" },
      "Unsupported project schema version.",
    ],
    [
      "missing identity fields",
      { schemaVersion: 1, projectId: "", name: "" },
      "Project ID is required. Project name is required.",
    ],
    [
      "unknown fields",
      {
        schemaVersion: 1,
        projectId: "project-1",
        name: "Badges",
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
