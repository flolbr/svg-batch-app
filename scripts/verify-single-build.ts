import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist");
const outputFiles = (
  await readdir(outputDirectory, { recursive: true })
).sort();

if (
  outputFiles.length !== 1 ||
  outputFiles[0].replaceAll(path.sep, "/") !== "index.html"
) {
  throw new Error(
    `Single-file build must contain only index.html; found: ${outputFiles.join(", ") || "nothing"}.`,
  );
}

const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
if (!/^<!doctype html>/i.test(html)) {
  throw new Error("Single-file build is missing an HTML doctype.");
}
if (!html.includes('id="svg-batch-project"')) {
  throw new Error("Single-file build is missing the embedded project block.");
}
if (!/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]+?<\/script>/i.test(html)) {
  throw new Error(
    "Single-file build is missing inline application JavaScript.",
  );
}
if (!/<style\b[^>]*>[\s\S]+?<\/style>/i.test(html)) {
  throw new Error("Single-file build is missing inline application CSS.");
}

const externalResource =
  /<(?:script|link|img|source|video|audio|iframe|embed|object)\b[^>]*\b(?:src|href|data|poster)\s*=\s*["'](?!data:|#)([^"']+)["']/i.exec(
    html,
  );
if (externalResource) {
  throw new Error(
    `Single-file build contains an external resource: ${externalResource[1]}.`,
  );
}

for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
  const externalCssUrl = /url\(\s*["']?(?!data:|#)([^"')]+)["']?\s*\)/i.exec(
    style[1],
  );
  if (externalCssUrl) {
    throw new Error(
      `Single-file build CSS contains an external resource: ${externalCssUrl[1]}.`,
    );
  }
  if (/@import\b/i.test(style[1])) {
    throw new Error("Single-file build CSS contains an @import dependency.");
  }
}

console.log(
  `Verified self-contained dist/index.html (${Buffer.byteLength(html)} bytes).`,
);
