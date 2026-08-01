import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { mappingTypesForTarget } from "../mappings/mappingStatus";
import type { Mapping } from "../mappings/schema";
import { importSvgFile, type ImportedSvg } from "./importSvg";

export const LINKED_SVG_DATABASE_NAME = "svg-batch-linked-svg";
export const LINKED_SVG_STORE = "handles";

export type LocalSvgFileHandle = {
  getFile(): Promise<File>;
  queryPermission?: (options?: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (options?: { mode: "read" }) => Promise<PermissionState>;
};

interface LinkedSvgDatabaseSchema extends DBSchema {
  [LINKED_SVG_STORE]: { key: string; value: LocalSvgFileHandle };
}

let databasePromise: Promise<IDBPDatabase<LinkedSvgDatabaseSchema>> | null =
  null;

function database(): Promise<IDBPDatabase<LinkedSvgDatabaseSchema>> {
  databasePromise ??= openDB<LinkedSvgDatabaseSchema>(
    LINKED_SVG_DATABASE_NAME,
    1,
    {
      upgrade(database) {
        if (!database.objectStoreNames.contains(LINKED_SVG_STORE)) {
          database.createObjectStore(LINKED_SVG_STORE);
        }
      },
    },
  );
  return databasePromise;
}

export function localSvgReference(projectId: string): string {
  return `local-svg:${projectId}`;
}

export async function saveLocalSvgHandle(
  reference: string,
  handle: LocalSvgFileHandle,
): Promise<void> {
  await (await database()).put(LINKED_SVG_STORE, handle, reference);
}

export async function loadLocalSvgHandle(
  reference: string,
): Promise<LocalSvgFileHandle | null> {
  return (await (await database()).get(LINKED_SVG_STORE, reference)) ?? null;
}

export async function readLocalLinkedSvg(
  reference: string,
): Promise<ImportedSvg> {
  const handle = await loadLocalSvgHandle(reference);
  if (!handle)
    throw new Error("The linked local SVG is unavailable on this device.");
  let permission = await handle.queryPermission?.({ mode: "read" });
  if (permission === "prompt")
    permission = await handle.requestPermission?.({ mode: "read" });
  if (permission === "denied")
    throw new Error("Permission to read the linked SVG was denied.");
  const imported = await importSvgFile(await handle.getFile());
  return { ...imported, sourceStatus: "linked" };
}

export async function readHttpsLinkedSvg(url: string): Promise<ImportedSvg> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "omit" });
  } catch {
    throw new Error(
      "The linked HTTPS SVG could not be fetched. Its server may not allow CORS.",
    );
  }
  if (!response.ok)
    throw new Error(`The linked HTTPS SVG returned HTTP ${response.status}.`);
  const source = await response.text();
  const imported = await importSvgFile(
    new File([source], fileNameFromUrl(url), { type: "image/svg+xml" }),
  );
  return { ...imported, sourceStatus: "linked" };
}

function fileNameFromUrl(url: string): string {
  const path = new URL(url).pathname.split("/").filter(Boolean).pop();
  return path || "linked.svg";
}

export async function sha256(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export type TemplateMappingComparison = {
  preserved: Mapping[];
  missingTargetIds: string[];
  incompatibleTargetIds: string[];
  newTargetIds: string[];
};

export function compareTemplateMappings(
  previous: ImportedSvg,
  next: ImportedSvg,
  mappings: readonly Mapping[],
): TemplateMappingComparison {
  const nextTargets = new Map(
    next.targets.map((target) => [target.id, target]),
  );
  const previousTargetIds = new Set(
    previous.targets.map((target) => target.id),
  );
  const preserved: Mapping[] = [];
  const missingTargetIds: string[] = [];
  const incompatibleTargetIds: string[] = [];

  for (const mapping of mappings) {
    const target = nextTargets.get(mapping.targetId);
    if (!target) {
      missingTargetIds.push(mapping.targetId);
    } else if (!mappingTypesForTarget(target.tagName).includes(mapping.type)) {
      incompatibleTargetIds.push(mapping.targetId);
    } else {
      preserved.push(mapping);
    }
  }

  return {
    preserved,
    missingTargetIds,
    incompatibleTargetIds,
    newTargetIds: next.targets
      .map((target) => target.id)
      .filter((id) => !previousTargetIds.has(id)),
  };
}
