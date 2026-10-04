import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as opentype from "opentype.js";
import { firefox, type Page } from "playwright";

const family = "Firefox Embedded Regression";
const localFamily = process.env.SVG_BATCH_LOCAL_FONT || "Ethnocentric";
const installedFamily = execFileSync(
  "fc-match",
  ["-f", "%{family}", localFamily],
  {
    encoding: "utf8",
  },
);
assert.ok(
  installedFamily.includes(localFamily),
  `Install ${localFamily} or set SVG_BATCH_LOCAL_FONT to an installed family.`,
);
const fontPath = new opentype.Path();
fontPath.moveTo(0, 0);
fontPath.lineTo(700, 0);
fontPath.lineTo(350, 700);
fontPath.close();
const font = new opentype.Font({
  familyName: family,
  styleName: "Regular",
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  glyphs: [
    new opentype.Glyph({ name: ".notdef", advanceWidth: 900 }),
    new opentype.Glyph({
      name: "A",
      unicode: 65,
      advanceWidth: 900,
      path: fontPath,
    }),
  ],
});
font.tables.os2.usWeightClass = 400;
const bytes = new Uint8Array(font.toArrayBuffer());
const folder = await mkdtemp(join(tmpdir(), "svg-firefox-fonts-"));
const svgPath = join(folder, "font-preview.svg");
const ttfPath = join(folder, "Firefox Embedded Regression.ttf");
const savedPath = join(folder, "saved-project.html");
await writeFile(ttfPath, bytes);
await writeFile(
  svgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="150" viewBox="0 0 500 150"><rect width="500" height="150" fill="white"/><text id="local" x="20" y="50"><tspan style="font-family:'${localFamily}';font-size:30px">GRUM Sénior</tspan></text><text id="embedded" x="20" y="110" style="font-family:'${family}';font-size:30px">AAAAA</text></svg>`,
);

const browser = await firefox.launch({
  executablePath: process.env.SVG_BATCH_FIREFOX || firefox.executablePath(),
  headless: true,
});
const network: string[] = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    acceptDownloads: true,
  });
  await context.route(/^https?:/, (route) => {
    network.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.dismiss());
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await page.getByLabel("Choose an SVG file").setInputFiles(svgPath);
  const frame = page.frameLocator('iframe[title="SVG preview"]');
  await frame.locator("#embedded").waitFor();
  const fallbackWidth = await frame
    .locator("#embedded")
    .evaluate((element) => (element as SVGTextElement).getComputedTextLength());
  const reference = await page.evaluate((localFamily) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    context.font = `30px "${localFamily}"`;
    const local = context.measureText("GRUM Sénior").width;
    context.font = "30px serif";
    return { local, fallback: context.measureText("GRUM Sénior").width };
  }, localFamily);
  assert.ok(
    Math.abs(reference.local - reference.fallback) > 1,
    "Local reference must differ from fallback.",
  );

  async function verifyPreview(page: Page) {
    assert.equal(
      await page.locator('iframe[title="SVG preview"]').getAttribute("sandbox"),
      "allow-same-origin",
    );
    const frame = page.frameLocator('iframe[title="SVG preview"]');
    const localWidth = await frame
      .locator("#local")
      .evaluate(async (element, localFamily) => {
        await document.fonts.load(`400 30px "${localFamily}"`);
        return (element as SVGTextElement).getComputedTextLength();
      }, localFamily);
    assert.ok(
      Math.abs(localWidth - reference.local) < 0.5,
      `Local preview ${localWidth} must match top-level ${reference.local}.`,
    );
    const embedded = await frame
      .locator("#embedded")
      .evaluate(async (element, family) => {
        const faces = await document.fonts.load(`400 30px "${family}"`);
        return {
          faces: faces.length,
          width: (element as SVGTextElement).getComputedTextLength(),
        };
      }, family);
    assert.equal(embedded.faces, 1);
    assert.ok(
      Math.abs(embedded.width - 135) < 0.5,
      `Embedded font width must be 135, got ${embedded.width}.`,
    );
    assert.ok(
      Math.abs(embedded.width - fallbackWidth) > 1,
      "Embedded preview must differ from the original fallback.",
    );
  }

  await page.getByLabel("Choose a font file").setInputFiles(ttfPath);
  await page.getByText("Add font (1)", { exact: true }).waitFor();
  await verifyPreview(page);
  await page
    .locator('iframe[title="SVG preview"]')
    .screenshot({ path: join(folder, "font-preview.png") });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  const download = await downloaded;
  await download.saveAs(savedPath);
  const html = await readFile(savedPath, "utf8");
  const projectBlock = html.match(
    /<script[^>]*id="svg-batch-project"[^>]*>([\s\S]*?)<\/script>/,
  );
  assert.ok(projectBlock, "Saved file must contain project data.");
  const project = JSON.parse(projectBlock[1]);
  assert.equal(project.assets.length, 1);
  assert.equal(project.assets[0].fontFamily, family);
  assert.equal(project.assets[0].fontWeight, "400");
  assert.equal(
    project.assets[0].dataUrl,
    `data:font/ttf;base64,${Buffer.from(bytes).toString("base64")}`,
  );
  assert.ok(project.template.acceptedSvg.includes("GRUM Sénior"));
  // Reopen in a fresh context so recovery state and downloaded font caches cannot hide persistence defects.
  await context.close();
  const reopenedContext = await browser.newContext({
    viewport: { width: 1600, height: 900 },
  });
  await reopenedContext.route(/^https?:/, (route) => {
    network.push(route.request().url());
    return route.abort();
  });
  const reopened = await reopenedContext.newPage();
  await reopened.goto(pathToFileURL(savedPath).href);
  await reopened.getByText("Add font (1)", { exact: true }).waitFor();
  await verifyPreview(reopened);
  await reopened
    .locator('iframe[title="SVG preview"]')
    .screenshot({ path: join(folder, "reopened-preview.png") });
  assert.deepEqual(
    network,
    [],
    "Self-contained upload/save/reopen must use no HTTP requests.",
  );
  console.log(
    `Firefox ${browser.version()}: local ${localFamily}, embedded font glyph widths, script-free sandbox, and saved-project reopen passed with no HTTP requests.`,
  );
  if (process.env.SVG_BATCH_KEEP_FONT_ARTIFACTS === "1") {
    console.log(`Visual acceptance artifacts: ${folder}`);
  }
} finally {
  await browser.close();
  if (process.env.SVG_BATCH_KEEP_FONT_ARTIFACTS !== "1")
    await rm(folder, { recursive: true, force: true });
}
