import { APP_ID, APP_VERSION } from "../appInfo";

export const RELEASE_PUBLIC_KEY: JsonWebKey = {
  crv: "P-256",
  ext: true,
  key_ops: ["verify"],
  kty: "EC",
  x: "333k_h90DNH21ug_VbNnLeNbt1_ys90Lo4LUlCgp7eU",
  y: "vBm2cLe7NaF4aBR3G5e23I1f3MNVbThncW6A3QP_W9I",
};
export const DEFAULT_RELEASE_MANIFEST_URL =
  "https://github.com/flolbr/svg-batch-app/releases/latest/download/manifest.json";

export type ReleaseInfo = {
  app: string;
  version: string;
  sha256: string;
  url: string;
  notes?: string;
};

type SignedManifestEnvelope = {
  payload: string;
  sig: string;
};

type Semver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type VerifyReleaseManifestOptions = {
  appId?: string;
  currentVersion?: string;
  publicKey?: JsonWebKey;
  requireNewer?: boolean;
};

export type UpdateCheck =
  | { status: "current"; version: string }
  | { status: "update"; release: ReleaseInfo }
  | { status: "error"; message: string };

export type CheckForUpdatesOptions = VerifyReleaseManifestOptions & {
  fetchImpl?: typeof fetch;
  manifestUrl?: string;
};

const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const sha256Pattern = /^[0-9a-f]{64}$/i;

function parseSemver(value: string): Semver {
  const match = semverPattern.exec(value);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split(".") ?? [],
  };
}

export function compareVersions(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] > b[key] ? 1 : -1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      return Number(leftPart) > Number(rightPart) ? 1 : -1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

function decodeBase64(value: string): Uint8Array {
  try {
    const decoded = atob(value);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new Error("Release manifest signature is not valid base64.");
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function parseEnvelope(value: unknown): SignedManifestEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Release manifest envelope must be an object.");
  }
  const envelope = value as Record<string, unknown>;
  if (
    Object.keys(envelope).some((key) => key !== "payload" && key !== "sig") ||
    typeof envelope.payload !== "string" ||
    typeof envelope.sig !== "string"
  ) {
    throw new Error("Release manifest envelope is malformed.");
  }
  return { payload: envelope.payload, sig: envelope.sig };
}

function parseReleaseInfo(value: unknown): ReleaseInfo {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Release manifest payload must be an object.");
  }
  const payload = value as Record<string, unknown>;
  if (
    Object.keys(payload).some(
      (key) => !["app", "version", "sha256", "url", "notes"].includes(key),
    ) ||
    typeof payload.app !== "string" ||
    typeof payload.version !== "string" ||
    typeof payload.sha256 !== "string" ||
    typeof payload.url !== "string" ||
    (payload.notes !== undefined && typeof payload.notes !== "string")
  ) {
    throw new Error("Release manifest payload is malformed.");
  }
  parseSemver(payload.version);
  if (!sha256Pattern.test(payload.sha256)) {
    throw new Error("Release manifest SHA-256 must be 64 hexadecimal characters.");
  }
  try {
    const url = new URL(payload.url);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("Release manifest URL must be an HTTPS URL.");
  }
  return {
    app: payload.app,
    version: payload.version,
    sha256: payload.sha256.toLowerCase(),
    url: payload.url,
    ...(payload.notes === undefined ? {} : { notes: payload.notes }),
  };
}

export async function verifyReleaseManifest(
  raw: string,
  options: VerifyReleaseManifestOptions = {},
): Promise<ReleaseInfo> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Release manifest is not valid JSON.");
  }
  const envelope = parseEnvelope(parsed);
  const key = await crypto.subtle.importKey(
    "jwk",
    options.publicKey ?? RELEASE_PUBLIC_KEY,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(decodeBase64(envelope.sig)),
    toArrayBuffer(new TextEncoder().encode(envelope.payload)),
  );
  if (!valid) throw new Error("Release manifest signature is invalid.");

  let payload: unknown;
  try {
    payload = JSON.parse(envelope.payload);
  } catch {
    throw new Error("Release manifest payload is not valid JSON.");
  }
  const release = parseReleaseInfo(payload);
  if (release.app !== (options.appId ?? APP_ID)) {
    throw new Error("Release manifest belongs to a different application.");
  }
  if (
    options.requireNewer !== false &&
    compareVersions(release.version, options.currentVersion ?? APP_VERSION) <= 0
  ) {
    throw new Error("Release manifest is not newer than the current version.");
  }
  return release;
}

export async function checkForUpdates(
  options: CheckForUpdatesOptions = {},
): Promise<UpdateCheck> {
  const currentVersion = options.currentVersion ?? APP_VERSION;
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(
      options.manifestUrl ?? DEFAULT_RELEASE_MANIFEST_URL,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`Update server responded with HTTP ${response.status}.`);
    }
    const release = await verifyReleaseManifest(await response.text(), {
      appId: options.appId,
      currentVersion,
      publicKey: options.publicKey,
      requireNewer: false,
    });
    return compareVersions(release.version, currentVersion) > 0
      ? { status: "update", release }
      : { status: "current", version: currentVersion };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Update check failed.",
    };
  }
}
