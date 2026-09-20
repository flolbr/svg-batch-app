import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  fetchVerifiedRelease,
  sha256Hex,
  validateReleaseShell,
} from "./releaseArtifact";
import type { ReleaseInfo } from "./releaseManifest";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

const project = {
  schemaVersion: 1,
  projectId: "new",
  name: "Untitled project",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    appVersion: "1.0.0",
  },
};

const shell = `<!doctype html><html><head></head><body><script id="svg-batch-project" type="application/json">${JSON.stringify(project)}</script><div id="root"></div></body></html>`;

function asArrayBuffer(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

async function releaseFor(html: string): Promise<ReleaseInfo> {
  return {
    app: "svg-batch-generator",
    version: "1.1.0",
    sha256: await sha256Hex(asArrayBuffer(html)),
    url: "https://releases.example.test/app-1.1.0.html",
  };
}

describe("validateReleaseShell", () => {
  it("accepts a valid single-file project shell", () => {
    expect(() => validateReleaseShell(shell)).not.toThrow();
  });

  it("rejects missing, duplicate, wrong-type, and invalid project blocks", () => {
    expect(() => validateReleaseShell("<html></html>")).toThrow(
      "exactly one project block",
    );
    expect(() =>
      validateReleaseShell(
        shell.replace("</script>", "</script><script id=\"svg-batch-project\"></script>"),
      ),
    ).toThrow("exactly one project block");
    expect(() =>
      validateReleaseShell(shell.replace('type="application/json"', 'type="text/plain"')),
    ).toThrow("application/json");
    expect(() =>
      validateReleaseShell(shell.replace('"schemaVersion":1', '"schemaVersion":2')),
    ).toThrow("Unsupported project schema version");
  });
});

describe("fetchVerifiedRelease", () => {
  it("returns only an artifact whose bytes match the signed digest", async () => {
    const release = await releaseFor(shell);
    let requestInit: RequestInit | undefined;
    const artifact = await fetchVerifiedRelease(release, async (_url, init) => {
      requestInit = init;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => asArrayBuffer(shell),
      } as Response;
    });

    expect(artifact.html).toBe(shell);
    expect(requestInit).toEqual({ cache: "no-store" });
  });

  it("rejects tampered bytes and failed downloads", async () => {
    const release = await releaseFor(shell);
    await expect(
      fetchVerifiedRelease(release, async () =>
        ({
          ok: true,
          status: 200,
          arrayBuffer: async () => asArrayBuffer(shell.replace("Untitled", "Changed")),
        }) as Response,
      ),
    ).rejects.toThrow("integrity check");

    await expect(
      fetchVerifiedRelease(release, async () =>
        ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }) as Response,
      ),
    ).rejects.toThrow("HTTP 404");
  });
});
