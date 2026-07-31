import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project } from "./projectSchema";

const idb = vi.hoisted(() => ({ openDB: vi.fn() }));

vi.mock("idb", () => ({ openDB: idb.openDB }));

const project = (): Project => ({
  schemaVersion: 1,
  projectId: "project-1",
  name: "Recovery project",
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
    createdAt: "2026-07-31T10:00:00.000Z",
    updatedAt: "2026-07-31T11:00:00.000Z",
    appVersion: "0.0.0",
  },
});

type RecoveryStore = typeof import("./recoveryStore");

let store: RecoveryStore;
let database: {
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  database = {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  idb.openDB.mockResolvedValue(database);
  store = await import("./recoveryStore");
});

describe("recoveryStore", () => {
  it("creates a stable project store during upgrade and saves a validated clone", async () => {
    const original = project();

    await store.saveRecoveryProject(original);

    expect(idb.openDB).toHaveBeenCalledWith(
      store.RECOVERY_DATABASE_NAME,
      store.RECOVERY_DATABASE_VERSION,
      expect.objectContaining({ upgrade: expect.any(Function) }),
    );
    const options = idb.openDB.mock.calls[0]?.[2] as {
      upgrade: (database: IDBDatabase) => void;
    };
    const upgradeDatabase = {
      objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
      createObjectStore: vi.fn(),
    };

    options.upgrade(upgradeDatabase as unknown as IDBDatabase);

    expect(upgradeDatabase.createObjectStore).toHaveBeenCalledWith(
      store.RECOVERY_PROJECT_STORE,
      { keyPath: "projectId" },
    );
    expect(database.put).toHaveBeenCalledWith(
      store.RECOVERY_PROJECT_STORE,
      original,
    );
    expect(database.put.mock.calls[0]?.[1]).not.toBe(original);
  });

  it("validates strictly before writing", async () => {
    const invalidProject = {
      ...project(),
      unexpected: true,
    } as unknown as Project;

    await expect(store.saveRecoveryProject(invalidProject)).rejects.toThrow();

    expect(idb.openDB).not.toHaveBeenCalled();
    expect(database.put).not.toHaveBeenCalled();
  });

  it("returns a validated clone of a stored project", async () => {
    const storedProject = { ...project(), name: " Recovery project " };
    database.get.mockResolvedValue(storedProject);

    const result = await store.loadRecoveryProject("project-1");

    expect(database.get).toHaveBeenCalledWith(
      store.RECOVERY_PROJECT_STORE,
      "project-1",
    );
    expect(result).toMatchObject({ name: "Recovery project" });
    expect(result).not.toBe(storedProject);
  });

  it("returns null for a missing project", async () => {
    await expect(store.loadRecoveryProject("missing")).resolves.toBeNull();

    expect(database.delete).not.toHaveBeenCalled();
  });

  it.each([
    ["corrupt", { projectId: "project-1" }],
    ["mismatched", { ...project(), projectId: "another-project" }],
    [
      "unsafe SVG",
      {
        ...project(),
        template: {
          fileName: "unsafe.svg",
          fileSize: 42,
          acceptedSvg:
            '<svg xmlns="http://www.w3.org/2000/svg"><text id="name" onload="alert(1)">Name</text></svg>',
          sourceStatus: "embedded",
          selectedObjectId: null,
        },
      },
    ],
  ])("deletes a %s recovery record", async (_kind, storedProject) => {
    database.get.mockResolvedValue(storedProject);

    await expect(store.loadRecoveryProject("project-1")).resolves.toBeNull();

    expect(database.delete).toHaveBeenCalledWith(
      store.RECOVERY_PROJECT_STORE,
      "project-1",
    );
  });

  it("deletes a recovery project by ID", async () => {
    await store.deleteRecoveryProject("project-1");

    expect(database.delete).toHaveBeenCalledWith(
      store.RECOVERY_PROJECT_STORE,
      "project-1",
    );
  });
});
