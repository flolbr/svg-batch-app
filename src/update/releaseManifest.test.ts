import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { compareVersions, verifyReleaseManifest } from "./releaseManifest";

const subtle = webcrypto.subtle;

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

async function signedManifest(payload: Record<string, unknown>): Promise<{
  raw: string;
  publicKey: JsonWebKey;
}> {
  const keyPair = (await subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const payloadText = JSON.stringify(payload);
  const signature = await subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    new TextEncoder().encode(payloadText),
  );
  return {
    raw: JSON.stringify({
      payload: payloadText,
      sig: Buffer.from(signature).toString("base64"),
    }),
    publicKey: await subtle.exportKey("jwk", keyPair.publicKey),
  };
}

const validPayload = {
  app: "svg-batch-generator",
  version: "1.2.0",
  sha256: "a".repeat(64),
  url: "https://releases.example.test/svg-batch-generator-1.2.0.html",
  notes: "Improved release checks.",
};

describe("compareVersions", () => {
  it("orders stable and prerelease versions", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBe(1);
    expect(compareVersions("1.2.0", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.0-beta.2", "1.2.0-beta.10")).toBe(-1);
    expect(compareVersions("1.2.0", "1.2.0-rc.1")).toBe(1);
  });

  it("rejects malformed versions", () => {
    expect(() => compareVersions("1.2", "1.1.0")).toThrow(
      "Invalid semantic version",
    );
  });
});

describe("verifyReleaseManifest", () => {
  it("verifies a signed newer release and returns normalized metadata", async () => {
    const manifest = await signedManifest(validPayload);

    await expect(
      verifyReleaseManifest(manifest.raw, {
        currentVersion: "1.1.0",
        publicKey: manifest.publicKey,
      }),
    ).resolves.toEqual(validPayload);
  });

  it("rejects a signature that does not match the payload", async () => {
    const manifest = await signedManifest(validPayload);
    const tampered = manifest.raw.replace("1.2.0", "1.3.0");

    await expect(
      verifyReleaseManifest(tampered, { publicKey: manifest.publicKey }),
    ).rejects.toThrow("signature is invalid");
  });

  it("rejects a release for another application", async () => {
    const manifest = await signedManifest({
      ...validPayload,
      app: "another-app",
    });

    await expect(
      verifyReleaseManifest(manifest.raw, { publicKey: manifest.publicKey }),
    ).rejects.toThrow("different application");
  });

  it("rejects malformed, insecure, and non-newer manifests", async () => {
    const malformed = await signedManifest({
      ...validPayload,
      sha256: "bad",
    });
    await expect(
      verifyReleaseManifest(malformed.raw, { publicKey: malformed.publicKey }),
    ).rejects.toThrow("SHA-256");

    const insecure = await signedManifest({
      ...validPayload,
      url: "http://releases.example.test/app.html",
    });
    await expect(
      verifyReleaseManifest(insecure.raw, { publicKey: insecure.publicKey }),
    ).rejects.toThrow("HTTPS");

    const old = await signedManifest({ ...validPayload, version: "1.1.0" });
    await expect(
      verifyReleaseManifest(old.raw, {
        currentVersion: "1.1.0",
        publicKey: old.publicKey,
      }),
    ).rejects.toThrow("not newer");
  });
});
