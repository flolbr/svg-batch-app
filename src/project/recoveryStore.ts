import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { restoreImportedSvg } from "../svg/importSvg";
import { projectSchema, type Project } from "./projectSchema";

export const RECOVERY_DATABASE_NAME = "svg-batch-project-recovery";
export const RECOVERY_DATABASE_VERSION = 1;
export const RECOVERY_PROJECT_STORE = "projects";

interface RecoveryDatabaseSchema extends DBSchema {
  [RECOVERY_PROJECT_STORE]: {
    key: string;
    value: Project;
  };
}

let databasePromise: Promise<IDBPDatabase<RecoveryDatabaseSchema>> | null =
  null;

function getDatabase(): Promise<IDBPDatabase<RecoveryDatabaseSchema>> {
  databasePromise ??= openDB<RecoveryDatabaseSchema>(
    RECOVERY_DATABASE_NAME,
    RECOVERY_DATABASE_VERSION,
    {
      upgrade(database) {
        if (!database.objectStoreNames.contains(RECOVERY_PROJECT_STORE)) {
          database.createObjectStore(RECOVERY_PROJECT_STORE, {
            keyPath: "projectId",
          });
        }
      },
    },
  );

  return databasePromise;
}

function validateRecoveryProject(project: unknown): Project {
  const validated = projectSchema.parse(project);
  if (validated.template) restoreImportedSvg(validated.template);
  return validated;
}

export async function saveRecoveryProject(project: Project): Promise<void> {
  const snapshot = structuredClone(validateRecoveryProject(project));
  const database = await getDatabase();

  await database.put(RECOVERY_PROJECT_STORE, snapshot);
}

export async function loadRecoveryProject(
  projectId: string,
): Promise<Project | null> {
  const database = await getDatabase();
  const storedProject = await database.get(RECOVERY_PROJECT_STORE, projectId);

  if (storedProject === undefined) {
    return null;
  }

  let validated: Project;
  try {
    validated = validateRecoveryProject(storedProject);
  } catch {
    await database.delete(RECOVERY_PROJECT_STORE, projectId);
    return null;
  }
  if (validated.projectId !== projectId) {
    await database.delete(RECOVERY_PROJECT_STORE, projectId);
    return null;
  }

  return structuredClone(validated);
}

export async function deleteRecoveryProject(projectId: string): Promise<void> {
  const database = await getDatabase();
  await database.delete(RECOVERY_PROJECT_STORE, projectId);
}
