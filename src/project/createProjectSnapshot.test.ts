import { describe, expect, it } from "vitest";
import type { SpreadsheetSource } from "../store";
import type { ImportedSvg } from "../svg/importSvg";
import { createProjectSnapshot } from "./createProjectSnapshot";
import type { Project } from "./projectSchema";

const project: Project = {
  schemaVersion: 1,
  projectId: "project-1",
  name: "Badges",
  data: {
    fileName: "members.csv",
    fileSize: 42,
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
  mappings: [],
  assets: [],
  exportSettings: {
    format: "svg",
    includeCsv: false,
    filenameTemplate: "old-{row}",
    collisionPolicy: "suffix",
    continueOnError: false,
  },
  sources: [
    {
      id: "svg-link",
      kind: "svg",
      location: "linked",
      fileName: "old.svg",
      fileSize: 1,
      reference: "local:old.svg",
    },
    {
      id: "spreadsheet-link",
      kind: "spreadsheet",
      location: "linked",
      fileName: "old.csv",
      fileSize: 1,
      reference: "local:members.csv",
    },
    {
      id: "image-source",
      kind: "image",
      location: "embedded",
      fileName: "photo.png",
      fileSize: 3,
    },
  ],
  audit: {
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T09:00:00.000Z",
    appVersion: "0.0.0",
  },
};

const svg: ImportedSvg = {
  fileName: "badge.svg",
  fileSize: 128,
  acceptedSvg:
    '<svg xmlns="http://www.w3.org/2000/svg"><text id="name" /></svg>',
  sourceStatus: "embedded",
  targets: [{ id: "name", tagName: "text" }],
  tree: [
    {
      id: "name",
      label: "name",
      tagName: "text",
      children: [],
    },
  ],
};

describe("createProjectSnapshot", () => {
  it("captures current template, mappings, export settings, sources, and audit", () => {
    const snapshot = createProjectSnapshot({
      project,
      spreadsheet: {},
      svg,
      selectedSvgObjectId: "name",
      mappings: [
        {
          id: "mapping-name",
          targetId: "name",
          columnId: "member-name",
          type: "text",
          fit: "keep",
        },
      ],
      exportSettings: {
        format: "pdf",
        includeCsv: true,
        filenameTemplate: "{member-name}",
        collisionPolicy: "error",
        continueOnError: true,
      },
      updatedAt: "2026-07-31T10:00:00.000Z",
      appVersion: "1.2.3",
    });

    expect(snapshot.template).toEqual({
      fileName: "badge.svg",
      fileSize: 128,
      acceptedSvg: svg.acceptedSvg,
      sourceStatus: "embedded",
      selectedObjectId: "name",
    });
    expect(snapshot.mappings).toHaveLength(1);
    expect(snapshot.exportSettings).toMatchObject({
      format: "pdf",
      includeCsv: true,
      collisionPolicy: "error",
      continueOnError: true,
    });
    expect(snapshot.sources).toEqual([
      {
        id: "svg-source",
        kind: "svg",
        location: "embedded",
        fileName: "badge.svg",
        fileSize: 128,
      },
      {
        id: "spreadsheet-link",
        kind: "spreadsheet",
        location: "linked",
        fileName: "members.csv",
        fileSize: 42,
        reference: "local:members.csv",
      },
      project.sources[2],
    ]);
    expect(snapshot.audit).toEqual({
      createdAt: project.audit.createdAt,
      updatedAt: "2026-07-31T10:00:00.000Z",
      appVersion: "1.2.3",
    });
    expect(snapshot.data).toEqual(project.data);
  });

  it("does not mutate current state and rejects an invalid snapshot", () => {
    const before = structuredClone({ project, svg });

    expect(() =>
      createProjectSnapshot({
        project,
        spreadsheet: {},
        svg,
        selectedSvgObjectId: null,
        mappings: [],
        exportSettings: project.exportSettings,
        updatedAt: "not-a-date",
      }),
    ).toThrow();
    expect({ project, svg }).toEqual(before);
  });

  it("replaces a stale spreadsheet reference after a new local import", () => {
    const snapshot = createProjectSnapshot({
      project,
      spreadsheet: {
        workbook: {} as NonNullable<SpreadsheetSource["workbook"]>,
      },
      svg: null,
      selectedSvgObjectId: null,
      mappings: [],
      exportSettings: project.exportSettings,
      updatedAt: "2026-07-31T10:00:00.000Z",
    });

    expect(snapshot.sources[0]).toEqual({
      id: "spreadsheet-source",
      kind: "spreadsheet",
      location: "embedded",
      fileName: "members.csv",
      fileSize: 42,
    });
  });
});
