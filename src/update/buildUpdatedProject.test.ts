import { describe, expect, it } from "vitest";
import { buildUpdatedProjectHtml } from "./buildUpdatedProject";
import { loadEmbeddedProject } from "../project/loadProject";
import type { Project } from "../project/projectSchema";

const shellProject: Project = {
  schemaVersion: 1,
  projectId: "shell",
  name: "Shell project",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    appVersion: "1.0.0",
  },
};

const currentProject = {
  ...shellProject,
  projectId: "current-project",
  name: "Current project",
  audit: {
    ...shellProject.audit,
    appVersion: "1.1.0",
  },
};

function shellHtml(): string {
  return `<!doctype html><html><head><meta name="svg-batch-app-version" content="1.1.0"></head><body><script id="svg-batch-project" type="application/json">${JSON.stringify(shellProject)}</script><div id="root"></div></body></html>`;
}

describe("buildUpdatedProjectHtml", () => {
  it("splices the current project into a new shell and preserves the shell", () => {
    const shell = shellHtml();
    const updated = buildUpdatedProjectHtml(shell, currentProject);

    expect(updated).toContain('content="1.1.0"');
    expect(updated).toContain('"projectId":"current-project"');
    expect(updated).not.toContain('"projectId":"shell"');
    expect(shell).toContain('"projectId":"shell"');

    const loaded = loadEmbeddedProject(
      new DOMParser().parseFromString(updated, "text/html"),
    );
    expect(loaded).toEqual({ success: true, project: currentProject });
  });

  it("escapes project markup and rejects an unverified shell", () => {
    const project = {
      ...currentProject,
      name: "<unsafe name>",
    };
    const updated = buildUpdatedProjectHtml(shellHtml(), project);
    expect(updated).toContain("\\u003cunsafe name>");
    expect(() => buildUpdatedProjectHtml("<html></html>", currentProject)).toThrow(
      "exactly one project block",
    );
  });
});
