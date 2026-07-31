import { z } from "zod";
import { parseProject, type Project } from "./projectSchema";

export type { Project } from "./projectSchema";

export type ProjectLoadResult =
  { success: true; project: Project } | { success: false; error: string };

export function loadEmbeddedProject(document: Document): ProjectLoadResult {
  const projectElement = document.getElementById("svg-batch-project");

  if (!projectElement) {
    return {
      success: false,
      error: "Embedded project data was not found.",
    };
  }

  let projectJson: unknown;
  try {
    projectJson = JSON.parse(projectElement.textContent ?? "");
  } catch {
    return {
      success: false,
      error: "Embedded project data is not valid JSON.",
    };
  }

  try {
    return { success: true, project: parseProject(projectJson) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join(" ")
          : error instanceof Error
            ? error.message
            : "Embedded project data could not be migrated.",
    };
  }
}
