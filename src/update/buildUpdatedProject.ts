import { serializeProjectHtml } from "../project/serializeProjectHtml";
import type { Project } from "../project/projectSchema";
import { validateReleaseShell } from "./releaseArtifact";

/**
 * Inserts a validated current project into a verified release shell.
 * Neither the shell string nor the project object is mutated.
 */
export function buildUpdatedProjectHtml(
  verifiedShellHtml: string,
  project: Project,
): string {
  validateReleaseShell(verifiedShellHtml);
  const shellDocument = new DOMParser().parseFromString(
    verifiedShellHtml,
    "text/html",
  );
  return serializeProjectHtml(shellDocument, project);
}
