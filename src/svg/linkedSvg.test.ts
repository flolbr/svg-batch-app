import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const idb = vi.hoisted(() => ({
  openDB: vi.fn(),
  database: { get: vi.fn(), put: vi.fn() },
}));

vi.mock("idb", () => ({ openDB: idb.openDB }));

import {
  compareTemplateMappings,
  loadLocalSvgHandle,
  readHttpsLinkedSvg,
  readLocalLinkedSvg,
  readLocalSvgHandle,
  saveLocalSvgHandle,
  sha256,
} from "./linkedSvg";

const acceptedSvg =
  '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Name</text></svg>';

const svg = (targets: Array<[string, string]>) => ({
  fileName: "card.svg",
  fileSize: 1,
  acceptedSvg: "<svg />",
  sourceStatus: "embedded" as const,
  tree: [],
  targets: targets.map(([id, tagName]) => ({ id, tagName })),
});

describe("compareTemplateMappings", () => {
  it("keeps compatible mappings and reports every preserved, missing, incompatible, and new object", () => {
    const result = compareTemplateMappings(
      svg([
        ["name", "text"],
        ["old", "g"],
        ["unmapped-old", "path"],
      ]),
      svg([
        ["name", "text"],
        ["old", "image"],
        ["new", "g"],
      ]),
      [
        {
          id: "name-map",
          targetId: "name",
          columnId: "name",
          type: "text",
          fit: "keep",
        },
        {
          id: "old-map",
          targetId: "old",
          columnId: "visible",
          type: "exclusive-group",
          match: "data-option",
          emptyBehavior: "error",
        },
        {
          id: "gone-map",
          targetId: "unmapped-old",
          columnId: "state",
          type: "visibility",
          trueValues: ["yes"],
          falseValues: ["no"],
          emptyBehavior: "error",
        },
      ],
    );

    expect(result.preserved.map((mapping) => mapping.id)).toEqual(["name-map"]);
    expect(result.preservedTargetIds).toEqual(["name"]);
    expect(result.missingTargetIds).toEqual(["unmapped-old"]);
    expect(result.incompatibleTargetIds).toEqual(["old"]);
    expect(result.newTargetIds).toEqual(["new"]);
  });
});

describe("sha256", () => {
  it("hashes accepted SVG text", async () => {
    if (!crypto.subtle) vi.stubGlobal("crypto", { subtle: crypto.subtle });
    await expect(sha256("<svg />")).resolves.toBe(
      "f68e724d27d8f77658c3fefb57fba1f236c3f0592e66bfbaac3547ffdcdadc8b",
    );
  });
});

describe("local SVG handles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idb.openDB.mockResolvedValue(idb.database);
    idb.database.get.mockResolvedValue(undefined);
    idb.database.put.mockResolvedValue(undefined);
  });

  it("stores and loads a handle by its portable reference", async () => {
    const handle = { getFile: vi.fn() };
    idb.database.get.mockResolvedValue(handle);

    await saveLocalSvgHandle("local-svg:project-1", handle);
    await expect(loadLocalSvgHandle("local-svg:project-1")).resolves.toBe(
      handle,
    );

    expect(idb.database.put).toHaveBeenCalledWith(
      "handles",
      handle,
      "local-svg:project-1",
    );
    expect(idb.database.get).toHaveBeenCalledWith(
      "handles",
      "local-svg:project-1",
    );
  });

  it("requests prompted permission and imports a validated linked SVG", async () => {
    const handle = {
      getFile: vi
        .fn()
        .mockResolvedValue(
          new File([acceptedSvg], "linked.svg", { type: "image/svg+xml" }),
        ),
      queryPermission: vi.fn().mockResolvedValue("prompt"),
      requestPermission: vi.fn().mockResolvedValue("granted"),
    };

    await expect(readLocalSvgHandle(handle)).resolves.toMatchObject({
      fileName: "linked.svg",
      sourceStatus: "linked",
      targets: [{ id: "name", tagName: "text" }],
    });
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: "read" });
  });

  it("rejects denied and unavailable handles without importing", async () => {
    const denied = {
      getFile: vi.fn(),
      queryPermission: vi.fn().mockResolvedValue("denied"),
    };
    await expect(readLocalSvgHandle(denied)).rejects.toThrow(
      "Permission to read the linked SVG was denied.",
    );
    expect(denied.getFile).not.toHaveBeenCalled();

    idb.database.get.mockResolvedValue(null);
    await expect(readLocalLinkedSvg("missing")).rejects.toThrow(
      "unavailable on this device",
    );
  });
});

describe("HTTPS SVG links", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("imports a successful response without credentials", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(acceptedSvg, { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      readHttpsLinkedSvg("https://example.test/card.svg"),
    ).resolves.toMatchObject({
      fileName: "card.svg",
      sourceStatus: "linked",
      targets: [{ id: "name", tagName: "text" }],
    });
    expect(fetch).toHaveBeenCalledWith("https://example.test/card.svg", {
      credentials: "omit",
    });
  });

  it("reports HTTP and likely CORS failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 })),
    );
    await expect(
      readHttpsLinkedSvg("https://example.test/missing.svg"),
    ).rejects.toThrow("HTTP 404");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed")));
    await expect(
      readHttpsLinkedSvg("https://example.test/cors.svg"),
    ).rejects.toThrow("may not allow CORS");
  });
});
