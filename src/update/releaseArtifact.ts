import type { ReleaseInfo } from "./releaseManifest";
import { parseProject } from "../project/projectSchema";

export type VerifiedReleaseArtifact = {
  bytes: ArrayBuffer;
  html: string;
};

function hexDigest(bytes: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) =>
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  );
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return hexDigest(bytes);
}

export function validateReleaseShell(html: string): void {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks = parsed.querySelectorAll("script#svg-batch-project");
  if (blocks.length !== 1) {
    throw new Error("Release shell must contain exactly one project block.");
  }
  const block = blocks[0];
  if (block.getAttribute("type") !== "application/json") {
    throw new Error("Release project block must use application/json.");
  }
  try {
    parseProject(JSON.parse(block.textContent ?? ""));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Release project block is invalid: ${error.message}`
        : "Release project block is invalid.",
    );
  }
}

export async function fetchVerifiedRelease(
  release: ReleaseInfo,
  fetchImpl: typeof fetch = fetch,
): Promise<VerifiedReleaseArtifact> {
  let response: Response;
  try {
    response = await fetchImpl(release.url, { cache: "no-store" });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Release download failed: ${error.message}`
        : "Release download failed.",
    );
  }
  if (!response.ok) {
    throw new Error(`Release download failed with HTTP ${response.status}.`);
  }

  const bytes = await response.arrayBuffer();
  const digest = await hexDigest(bytes);
  if (digest !== release.sha256.toLowerCase()) {
    throw new Error("Downloaded release failed its SHA-256 integrity check.");
  }
  const html = new TextDecoder().decode(bytes);
  validateReleaseShell(html);
  return { bytes, html };
}
