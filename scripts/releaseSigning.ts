import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

export const APP_ID = "svg-batch-generator";
export const DEFAULT_KEY_PATH = resolve(
  homedir(),
  ".svg-batch-generator",
  "release-key.json",
);

export type ReleaseKey = {
  private: JsonWebKey;
  public: JsonWebKey;
};

export type ReleaseManifestInput = {
  app?: string;
  version: string;
  artifact: Uint8Array;
  url: string;
  notes?: string;
  privateKey: JsonWebKey;
};

export function generateReleaseKey(): ReleaseKey {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  return {
    private: privateKey.export({ format: "jwk" }) as JsonWebKey,
    public: publicKey.export({ format: "jwk" }) as JsonWebKey,
  };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createSignedReleaseManifest({
  app = APP_ID,
  version,
  artifact,
  url,
  notes,
  privateKey,
}: ReleaseManifestInput): string {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  if (!/^https:\/\//.test(url)) {
    throw new Error("Release artifact URL must use HTTPS.");
  }
  const payload = JSON.stringify({
    app,
    version,
    sha256: sha256Hex(artifact),
    url,
    ...(notes ? { notes } : {}),
  });
  const key = createPrivateKey({ key: privateKey, format: "jwk" });
  const signature = sign("sha256", Buffer.from(payload, "utf8"), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  const publicKey = createPublicKey(key);
  if (
    !verify(
      "sha256",
      Buffer.from(payload, "utf8"),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      signature,
    )
  ) {
    throw new Error("Release manifest signature did not self-verify.");
  }
  return `${JSON.stringify(
    { payload, sig: signature.toString("base64") },
    null,
    2,
  )}\n`;
}

export function writeReleaseKey(path: string, key: ReleaseKey): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(key, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function runCli(): void {
  const command = process.argv[2];
  const keyPath = process.env.SVG_BATCH_RELEASE_KEY || DEFAULT_KEY_PATH;
  if (command === "keygen") {
    if (existsSync(keyPath)) throw new Error(`Refusing to overwrite ${keyPath}.`);
    const key = generateReleaseKey();
    writeReleaseKey(keyPath, key);
    console.log(`Wrote offline release key to ${keyPath}.`);
    console.log(`Embedded public key:\n${JSON.stringify(key.public, null, 2)}`);
    return;
  }
  if (command !== "manifest") {
    throw new Error(
      "Usage: bun scripts/releaseSigning.ts keygen | manifest --artifact=... --url=https://... [--version=...] [--notes=...] [--output=...]",
    );
  }
  const artifactPath = argument("artifact");
  const url = argument("url");
  if (!artifactPath || !url) throw new Error("Manifest requires --artifact and --url.");
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    version?: string;
  };
  const version = argument("version") || packageJson.version;
  if (!version) throw new Error("Manifest requires a package version.");
  const output = argument("output") || "release/manifest.json";
  const key = JSON.parse(readFileSync(keyPath, "utf8")) as ReleaseKey;
  const manifest = createSignedReleaseManifest({
    artifact: new Uint8Array(readFileSync(artifactPath)),
    privateKey: key.private,
    url,
    version,
    notes: argument("notes"),
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, manifest, "utf8");
  console.log(`Wrote signed release manifest to ${output}.`);
}

if (process.argv[1]?.endsWith("releaseSigning.ts")) runCli();
