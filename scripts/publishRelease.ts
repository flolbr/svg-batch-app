import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSignedReleaseManifest, DEFAULT_KEY_PATH, type ReleaseKey } from "./releaseSigning";

type PackageMetadata = { name?: string; version?: string };

const repo = "flolbr/svg-batch-app";
const pagesRoot = `https://flolbr.github.io/svg-batch-app`;

function run(command: string, args: string[], cwd?: string): void {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function output(command: string, args: string[], cwd?: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function main(): void {
  const metadata = JSON.parse(readFileSync("package.json", "utf8")) as PackageMetadata;
  const version = metadata.version;
  if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("package.json must contain a valid release version.");
  }
  if (output("git", ["status", "--porcelain"])) {
    throw new Error("Release publication requires a clean git worktree.");
  }
  const keyPath = process.env.SVG_BATCH_RELEASE_KEY || DEFAULT_KEY_PATH;
  const key = JSON.parse(readFileSync(keyPath, "utf8")) as ReleaseKey;
  const tempRoot = mkdtempSync(join(tmpdir(), "svg-batch-release-"));
  const site = join(tempRoot, "site");
  const artifactName = `svg-batch-generator-${version}.html`;
  const artifactPath = join(tempRoot, artifactName);
  const artifactUrl = `${pagesRoot}/releases/v${version}/${artifactName}`;
  try {
    run("bun", ["run", "verify:single"]);
    cpSync("dist/index.html", artifactPath);
    const manifest = createSignedReleaseManifest({
      artifact: new Uint8Array(readFileSync(artifactPath)),
      privateKey: key.private,
      url: artifactUrl,
      version,
      notes: process.env.SVG_BATCH_RELEASE_NOTES,
    });
    mkdirSync(site, { recursive: true });
    try {
      run("git", ["clone", "--depth=1", "--branch", "gh-pages", `https://github.com/${repo}.git`, site]);
    } catch {
      rmSync(site, { recursive: true, force: true });
      mkdirSync(site, { recursive: true });
      run("git", ["init", "-b", "gh-pages"], site);
      run("git", ["remote", "add", "origin", `https://github.com/${repo}.git`], site);
    }
    mkdirSync(join(site, "releases", `v${version}`), { recursive: true });
    cpSync(artifactPath, join(site, "releases", `v${version}`, artifactName));
    cpSync("dist/index.html", join(site, "index.html"));
    writeFileSync(join(site, "manifest.json"), manifest);
    run("git", ["add", "index.html", "manifest.json", "releases"], site);
    run("git", ["-c", "user.name=svg-batch-release", "-c", "user.email=actions@users.noreply.github.com", "commit", "-m", `release: publish v${version}`], site);
    run("git", ["push", "origin", "gh-pages"], site);
    try {
      run("gh", ["api", `repos/${repo}/pages`]);
    } catch {
      run("gh", ["api", "--method", "POST", `repos/${repo}/pages`, "-f", "source[branch]=gh-pages", "-f", "source[path]=/"]);
    }
    run("gh", ["release", "create", `v${version}`, artifactPath, join(site, "manifest.json"), "--repo", repo, "--title", `v${version}`, "--generate-notes"]);
    console.log(`Published ${version} to GitHub Pages and GitHub Release.`);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
