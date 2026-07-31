import type { Mapping } from "../mappings/schema";
import type { SpreadsheetSource } from "../store";
import type { ImportedSvg } from "../svg/importSvg";
import {
  projectSchema,
  type ExportSettings,
  type PersistedSourceReference,
  type Project,
} from "./projectSchema";

type CreateProjectSnapshotInput = {
  project: Project;
  spreadsheet: Pick<SpreadsheetSource, "workbook"> | null;
  svg: ImportedSvg | null;
  selectedSvgObjectId: string | null;
  mappings: readonly Mapping[];
  exportSettings: ExportSettings;
  updatedAt: string;
  appVersion?: string;
};

function currentSource(
  project: Project,
  kind: "svg" | "spreadsheet",
  fileName: string,
  fileSize: number,
  preserveExisting: boolean,
): PersistedSourceReference {
  const existing = project.sources.find((source) => source.kind === kind);
  if (preserveExisting && existing) {
    return { ...existing, fileName, fileSize };
  }
  return {
    id: `${kind}-source`,
    kind,
    location: "embedded",
    fileName,
    fileSize,
  };
}

export function createProjectSnapshot({
  project,
  spreadsheet,
  svg,
  selectedSvgObjectId,
  mappings,
  exportSettings,
  updatedAt,
  appVersion = project.audit.appVersion,
}: CreateProjectSnapshotInput): Project {
  const sources: PersistedSourceReference[] = [];
  if (svg) {
    sources.push(
      currentSource(
        project,
        "svg",
        svg.fileName,
        svg.fileSize,
        svg.sourceStatus !== "embedded",
      ),
    );
  }
  if (project.data) {
    sources.push(
      currentSource(
        project,
        "spreadsheet",
        project.data.fileName,
        project.data.fileSize,
        !spreadsheet?.workbook,
      ),
    );
  }
  sources.push(...project.sources.filter((source) => source.kind === "image"));

  return projectSchema.parse({
    ...project,
    template: svg
      ? {
          fileName: svg.fileName,
          fileSize: svg.fileSize,
          acceptedSvg: svg.acceptedSvg,
          sourceStatus: svg.sourceStatus,
          selectedObjectId: selectedSvgObjectId,
        }
      : undefined,
    mappings,
    exportSettings,
    sources,
    audit: {
      ...project.audit,
      updatedAt,
      appVersion,
    },
  });
}
