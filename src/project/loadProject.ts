import { z } from "zod";
import { dataProjectStateSchema } from "./dataProjectState";

const projectSchema = z
  .object({
    schemaVersion: z.literal(1, {
      error: "Unsupported project schema version.",
    }),
    projectId: z.string().trim().min(1, "Project ID is required."),
    name: z.string().trim().min(1, "Project name is required."),
    data: dataProjectStateSchema.optional(),
  })
  .strict();

export type Project = z.infer<typeof projectSchema>;

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

  const result = projectSchema.safeParse(projectJson);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((issue) => issue.message).join(" "),
    };
  }

  return { success: true, project: result.data };
}
