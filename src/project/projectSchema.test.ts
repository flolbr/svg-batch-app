import { describe, expect, it } from "vitest";
import { parseProject, projectSchema } from "./projectSchema";

const validProject = {
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
};

describe("projectSchema", () => {
  it("parses a complete version-1 project", () => {
    expect(projectSchema.parse(validProject)).toEqual(validProject);
  });

  it("rejects unknown fields at nested persisted boundaries", () => {
    const project = structuredClone(validProject);
    Object.assign(project.assets[0], { unexpected: true });

    const result = projectSchema.safeParse(project);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unrecognized_keys",
            path: ["assets", 0],
          }),
        ]),
      );
    }
  });

  it("rejects invalid project fields", () => {
    const project = structuredClone(validProject);
    project.exportSettings.filenameTemplate = "   ";
    project.assets[0].dataUrl = "data:image/jpeg;base64,abc";
    project.sources[3].url = "http://example.test/banner.webp";

    expect(projectSchema.safeParse(project).success).toBe(false);
  });
});

describe("parseProject", () => {
  it("dispatches version 1 through the strict schema without mutating input", () => {
    const project = structuredClone(validProject);
    project.name = " Member cards ";
    const before = structuredClone(project);

    expect(parseProject(project)).toMatchObject({ name: "Member cards" });
    expect(project).toEqual(before);
  });

  it("rejects unsupported and missing schema versions with useful errors", () => {
    expect(() => parseProject({ ...validProject, schemaVersion: 2 })).toThrow(
      "Unsupported project schema version: 2.",
    );
    const { schemaVersion: _schemaVersion, ...withoutVersion } = validProject;
    expect(() => parseProject(withoutVersion)).toThrow(
      "Project schemaVersion is required.",
    );
  });
});
