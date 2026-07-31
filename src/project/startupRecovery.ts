import type { Project } from "./projectSchema";

export function isRecoveryNewer(
  savedProject: Project,
  recoveryProject: Project | null,
): recoveryProject is Project {
  return (
    recoveryProject?.projectId === savedProject.projectId &&
    Date.parse(recoveryProject.audit.updatedAt) >
      Date.parse(savedProject.audit.updatedAt)
  );
}
