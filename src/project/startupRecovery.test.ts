import { describe, expect, it } from "vitest";
import type { Project } from "./projectSchema";
import { isRecoveryNewer } from "./startupRecovery";

function project(projectId: string, updatedAt: string): Project {
  return {
    schemaVersion: 1,
    projectId,
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
      createdAt: "2026-07-30T08:00:00.000Z",
      updatedAt,
      appVersion: "0.0.0",
    },
  };
}

describe("isRecoveryNewer", () => {
  const saved = project("project-1", "2026-07-31T10:00:00.000Z");

  it("accepts only a newer recovery for the same project", () => {
    expect(
      isRecoveryNewer(saved, project("project-1", "2026-07-31T10:00:00.001Z")),
    ).toBe(true);
    expect(
      isRecoveryNewer(saved, project("project-1", "2026-07-31T10:00:00.000Z")),
    ).toBe(false);
    expect(
      isRecoveryNewer(saved, project("project-1", "2026-07-31T09:59:59.999Z")),
    ).toBe(false);
  });

  it("rejects missing and different-project recovery records", () => {
    expect(isRecoveryNewer(saved, null)).toBe(false);
    expect(
      isRecoveryNewer(saved, project("project-2", "2026-07-31T11:00:00.000Z")),
    ).toBe(false);
  });
});
