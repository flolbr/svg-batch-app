import { projectSchema, type Project } from "./projectSchema";

const projectBlockId = "svg-batch-project";

/**
 * Returns a standalone project HTML document from a clean, pre-mount shell.
 * The supplied document is never changed.
 */
export function serializeProjectHtml(
  sourceDocument: Document,
  project: Project,
): string {
  const validatedProject = projectSchema.parse(project);
  const projectDocument = sourceDocument.cloneNode(true) as Document;
  const projectBlock = projectDocument.getElementById(projectBlockId);

  if (!projectBlock) {
    throw new Error(
      "Clean HTML shell is missing the #svg-batch-project project block.",
    );
  }

  if (projectBlock.tagName !== "SCRIPT") {
    throw new Error(
      "The #svg-batch-project project block must be a script element.",
    );
  }

  if (projectBlock.getAttribute("type") !== "application/json") {
    throw new Error(
      'The #svg-batch-project project block must have type="application/json".',
    );
  }

  projectBlock.textContent = JSON.stringify(validatedProject).replaceAll(
    "<",
    "\\u003c",
  );

  return `<!doctype html>\n${projectDocument.documentElement.outerHTML}`;
}
