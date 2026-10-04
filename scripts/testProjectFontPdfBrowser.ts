import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { createServer } from "vite";
import { chromium } from "playwright";

const server = await createServer({
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0 },
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string")
    throw new Error("Vite test server did not start.");
  browser = await chromium.launch({
    executablePath: process.env.SVG_BATCH_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(
    `http://127.0.0.1:${address.port}/tests/browser/project-font-pdf.html`,
  );
  await page.waitForFunction(
    () => typeof window.exportFontRegression === "function",
  );
  const encodedPdfs = await page.evaluate(() => window.exportFontRegression());
  assert.equal(encodedPdfs.length, 4);

  const [alpha, beta, imagePdf, maskedPdf] = encodedPdfs.map((encoded) =>
    Buffer.from(encoded, "base64"),
  );
  for (const pdf of [alpha, beta]) {
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    assert.ok(
      pdf.byteLength < 100_000,
      "vector-only sample PDF should remain small",
    );
    assert.equal(pdf.toString("latin1").includes("/Subtype /Image"), false);
  }
  assert.notDeepEqual(
    alpha,
    beta,
    "different row text must create different PDF paths",
  );
  assert.equal(
    (imagePdf.toString("latin1").match(/\/Subtype \/Image/g) ?? []).length,
    2,
    "transparent PNG should retain its color image and PDF alpha mask",
  );
  assert.match(
    imagePdf.toString("latin1"),
    /\/SMask \d+ 0 R/,
    "PNG needs an alpha mask",
  );
  assert.match(
    imagePdf.toString("latin1"),
    /\/Width 24\s+\/Height 24/,
    "only the original image pixels should be embedded",
  );
  for (const pdf of [imagePdf, maskedPdf]) {
    const streams = [
      ...pdf
        .toString("latin1")
        .matchAll(/<<([^]*?)>>\s*stream\r?\n([^]*?)\r?\nendstream/g),
    ];
    assert.ok(
      streams.some(([, dictionary, data]) => {
        if (dictionary.includes("/Subtype /Image")) return false;
        const content = dictionary.includes("/FlateDecode")
          ? inflateSync(Buffer.from(data, "latin1")).toString("latin1")
          : data;
        // Five glyph contours plus the background; a page bitmap has no glyph paths.
        return (content.match(/[\d.-]+ [\d.-]+ m\s/g) ?? []).length >= 6;
      }),
      "image-bearing pages must still contain all five vector glyph paths",
    );
  }
  assert.match(
    maskedPdf.toString("latin1"),
    /\/SMask \d+ 0 R/,
    "masked artwork needs baked image alpha",
  );
  assert.equal(
    (maskedPdf.toString("latin1").match(/\/Subtype \/Image/g) ?? []).length,
    2,
    "only masked artwork and its alpha should be raster",
  );
  if (process.env.SVG_BATCH_PDF_RENDER_CHECK === "1") {
    const directory = await mkdtemp(join(tmpdir(), "svg-pdf-pixels-"));
    try {
      const filename = join(directory, "masked.pdf");
      await writeFile(filename, maskedPdf);
      execFileSync("pdftoppm", [
        "-scale-to-x",
        "640",
        "-scale-to-y",
        "360",
        "-singlefile",
        filename,
        join(directory, "page"),
      ]);
      const ppm = await readFile(join(directory, "page.ppm"));
      const header = ppm.toString("latin1").match(/^P6\s+640\s+360\s+255\s/);
      assert.ok(header, "expected a 640 × 360 RGB rendering");
      const pixel = (x: number, y: number) =>
        Array.from(
          ppm.subarray(
            header[0].length + (y * 640 + x) * 3,
            header[0].length + (y * 640 + x) * 3 + 3,
          ),
        );
      assert.deepEqual(
        pixel(42, 42),
        [255, 255, 255],
        "masked image corners must be transparent",
      );
      const center = pixel(136, 136);
      assert.ok(
        center[0] >= 49 &&
          center[0] <= 53 &&
          center[1] > 175 &&
          center[2] > 210,
        "masked image color and 80% group opacity must survive",
      );
      assert.ok(
        pixel(200, 180)[2] < 110,
        "vector glyphs must remain visible alongside the masked image",
      );
      console.log(
        "Rendered PDF checks passed: transparent corners, image color, group opacity, and visible glyphs.",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  const maskedOutput = process.env.SVG_BATCH_MASKED_PDF_OUTPUT;
  if (maskedOutput) await writeFile(maskedOutput, maskedPdf);
  const imagePdfOutput = process.env.SVG_BATCH_IMAGE_PDF_OUTPUT;
  if (imagePdfOutput) await writeFile(imagePdfOutput, imagePdf);
  console.log(
    "Browser PDF regression passed: distinct image-free vector PDFs and vector text alongside a transparent-image PDF.",
  );
} finally {
  await browser?.close();
  await server.close();
}
