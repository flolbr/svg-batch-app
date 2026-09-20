import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createSignedReleaseManifest,
  generateReleaseKey,
  sha256Hex,
} from "./releaseSigning";
import { verifyReleaseManifest } from "../src/update/releaseManifest";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("release signing", () => {
  it("generates keys and signs a manifest with a pinned artifact hash", () => {
    const key = generateReleaseKey();
    const artifact = new TextEncoder().encode("single-file release");
    const manifest = JSON.parse(
      createSignedReleaseManifest({
        artifact,
        privateKey: key.private,
        url: "https://releases.example.test/app-1.2.0.html",
        version: "1.2.0",
        notes: "Signed update.",
      }),
    ) as { payload: string; sig: string };
    const payload = JSON.parse(manifest.payload) as Record<string, string>;

    expect(payload).toMatchObject({
      app: "svg-batch-generator",
      version: "1.2.0",
      sha256: sha256Hex(artifact),
      notes: "Signed update.",
    });
    expect(manifest.sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("rejects invalid versions and non-HTTPS artifact URLs", () => {
    const key = generateReleaseKey();
    const input = {
      artifact: new TextEncoder().encode("release"),
      privateKey: key.private,
      url: "https://releases.example.test/app.html",
      version: "1.2",
    };
    expect(() => createSignedReleaseManifest(input)).toThrow(
      "Invalid semantic version",
    );
    expect(() =>
      createSignedReleaseManifest({ ...input, url: "http://example.test/app.html", version: "1.2.0" }),
    ).toThrow("HTTPS");
  });

  it("produces an envelope accepted by the shipped Web Crypto verifier", async () => {
    const key = generateReleaseKey();
    const artifact = new TextEncoder().encode("release artifact");
    const raw = createSignedReleaseManifest({
      artifact,
      privateKey: key.private,
      url: "https://releases.example.test/app-1.3.0.html",
      version: "1.3.0",
    });

    await expect(
      verifyReleaseManifest(raw, {
        currentVersion: "1.2.0",
        publicKey: key.public,
      }),
    ).resolves.toMatchObject({ version: "1.3.0" });
  });
});
