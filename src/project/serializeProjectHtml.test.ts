import { describe, expect, it } from "vitest";
import { loadEmbeddedProject } from "./loadProject";
import type { Project } from "./projectSchema";
import { serializeProjectHtml } from "./serializeProjectHtml";

function completeProject(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    projectId: "project-1",
    name: "Member cards",
    template: {
      fileName: "card.svg",
      fileSize: 128,
      acceptedSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><text id="name" /></svg>',
      sourceStatus: "embedded",
      selectedObjectId: null,
    },
    data: {
      fileName: "members.csv",
      fileSize: 42,
      sheetNames: ["Members"],
      selectedSheetName: "Members",
      worksheets: {
        Members: {
          data: {
            columns: [
              {
                id: "name",
                sourceHeader: "Name",
                displayName: "Name",
                sourceIndex: 0,
                inferredType: "text",
              },
            ],
            rows: [
              {
                id: "source-1",
                values: { name: "Ada" },
                displayedValues: { name: "Ada" },
              },
            ],
          },
          selectedRowIds: ["source-1"],
          filters: [],
          rowOverrides: [],
          manualRows: [],
          columnPreferences: { visible: ["name"], exported: ["name"] },
        },
      },
    },
    mappings: [
      {
        id: "mapping-1",
        targetId: "name",
        columnId: "name",
        type: "text",
        fit: "keep",
      },
    ],
    assets: [
      {
        id: "photo-1",
        fileName: "photo.png",
        fileSize: 3,
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,abc",
      },
    ],
    exportSettings: {
      format: "svg",
      includeCsv: true,
      filenameTemplate: "card-{row}",
      collisionPolicy: "suffix",
      continueOnError: false,
    },
    sources: [
      {
        id: "source-svg",
        kind: "svg",
        location: "embedded",
        fileName: "card.svg",
        fileSize: 128,
      },
      {
        id: "source-sheet",
        kind: "spreadsheet",
        location: "linked",
        fileName: "members.csv",
        fileSize: 42,
        reference: "local:members.csv",
      },
      {
        id: "source-drive-image",
        kind: "image",
        location: "drive",
        fileName: "logo.png",
        fileSize: 12,
        fileId: "drive-file-1",
      },
      {
        id: "source-url-image",
        kind: "image",
        location: "https",
        fileName: "banner.webp",
        fileSize: 24,
        url: "https://example.test/banner.webp",
      },
    ],
    audit: {
      createdAt: "2026-07-31T10:00:00.000Z",
      updatedAt: "2026-07-31T11:00:00.000Z",
      appVersion: "0.0.0",
      templateHash: "abc123",
      lastTemplateUpdate: {
        oldHash: "old123",
        newHash: "abc123",
        updatedAt: "2026-07-31T11:00:00.000Z",
        missingTargetIds: ["removed-target"],
      },
    },
    ...overrides,
  };
}

function cleanShell(
  projectBlock = '<script id="svg-batch-project" type="application/json">old</script>',
) {
  return new DOMParser().parseFromString(
    `<!doctype html><html><head><title>SVG Batch</title></head><body><main id="app">Shell</main>${projectBlock}</body></html>`,
    "text/html",
  );
}

describe("serializeProjectHtml", () => {
  it("replaces the project block without changing or duplicating the source shell", () => {
    const sourceDocument = cleanShell();
    const originalProjectText =
      sourceDocument.getElementById("svg-batch-project")?.textContent;
    const project = completeProject();

    const html = serializeProjectHtml(sourceDocument, project);
    const savedDocument = new DOMParser().parseFromString(html, "text/html");

    expect(html.startsWith("<!doctype html>\n")).toBe(true);
    expect(
      sourceDocument.getElementById("svg-batch-project")?.textContent,
    ).toBe(originalProjectText);
    expect(sourceDocument.querySelectorAll("#svg-batch-project")).toHaveLength(
      1,
    );
    expect(savedDocument.querySelectorAll("#svg-batch-project")).toHaveLength(
      1,
    );
    expect(savedDocument.getElementById("app")?.textContent).toBe("Shell");
    expect(loadEmbeddedProject(savedDocument)).toEqual({
      success: true,
      project,
    });
  });

  it("escapes literal less-than characters to keep closing script text inert", () => {
    const project = completeProject({
      name: "Cards </script> < safe",
      template: {
        ...completeProject().template!,
        acceptedSvg:
          '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Less than: &lt;</text></svg>',
      },
    });

    const html = serializeProjectHtml(cleanShell(), project);
    const savedDocument = new DOMParser().parseFromString(html, "text/html");
    const blockText =
      savedDocument.getElementById("svg-batch-project")?.textContent;

    expect(html).toContain("\\u003c/script>");
    expect(html).not.toContain("Cards </script>");
    expect(blockText).toContain("\\u003c/script>");
    expect(loadEmbeddedProject(savedDocument)).toEqual({
      success: true,
      project,
    });
  });

  it("reports a missing project block", () => {
    expect(() =>
      serializeProjectHtml(cleanShell(""), completeProject()),
    ).toThrow(
      "Clean HTML shell is missing the #svg-batch-project project block.",
    );
  });

  it("reports a project block with the wrong type", () => {
    expect(() =>
      serializeProjectHtml(
        cleanShell(
          '<script id="svg-batch-project" type="text/plain"></script>',
        ),
        completeProject(),
      ),
    ).toThrow(
      'The #svg-batch-project project block must have type="application/json".',
    );
  });

  it("refuses to save a Vite development shell as a portable project", () => {
    const sourceDocument = cleanShell();
    const entry = sourceDocument.createElement("script");
    entry.type = "module";
    entry.src = "/src/main.tsx";
    sourceDocument.body.append(entry);

    expect(() => serializeProjectHtml(sourceDocument, completeProject())).toThrow(
      "Portable project saving is unavailable in the Vite dev shell",
    );
  });

  it("rejects invalid runtime project objects before serializing", () => {
    const sourceDocument = cleanShell();
    const invalidProject = {
      ...completeProject(),
      name: "   ",
    } as Project;

    expect(() => serializeProjectHtml(sourceDocument, invalidProject)).toThrow(
      "Project name is required.",
    );
    expect(
      sourceDocument.getElementById("svg-batch-project")?.textContent,
    ).toBe("old");
  });
});
