import assert from "node:assert/strict";
import { build } from "vite";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, firefox } from "playwright";

// Real app/browser, injected Google scripts only; no Google account or API calls.
const folder = await mkdtemp(join(tmpdir(), "drive-auth-browser-"));
await build({
  mode: "single",
  build: { outDir: folder },
  logLevel: "error",
  define: {
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify("test-client"),
    "import.meta.env.VITE_GOOGLE_API_KEY": JSON.stringify("test-key"),
    "import.meta.env.VITE_GOOGLE_APP_ID": JSON.stringify("test-app"),
    "import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS": "window.location.origin",
  },
});
const html = await readFile(join(folder, "index.html"));
const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end(html);
});
try {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  for (const engine of [chromium, firefox]) {
    for (const failure of [
      "access_denied",
      "popup_closed",
      "popup_failed_to_open",
      "blocked-script",
    ]) {
      const browser = await engine.launch({
        headless: true,
        ...(engine === chromium
          ? {
              executablePath:
                process.env.SVG_BATCH_CHROMIUM || "/usr/bin/chromium",
              args: ["--no-sandbox"],
            }
          : {}),
      });
      try {
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        page.setDefaultNavigationTimeout(15_000);
        console.log(`${engine.name()}: starting ${failure}`);
        let blocked = failure === "blocked-script";
        let googleRequests = 0;
        await context.route("https://**/*", async (route) => {
          googleRequests += 1;
          const url = route.request().url();
          if (url === "https://accounts.google.com/gsi/client") {
            if (blocked) return route.abort();
            return route.fulfill({
              contentType: "text/javascript",
              body: `
              window.authAttempts = 0;
              window.google = { accounts: { oauth2: { initTokenClient(options) {
                return { requestAccessToken() {
                  window.authAttempts++;
                  if (window.authAttempts > 1 || ${JSON.stringify(failure)} === "blocked-script")
                    options.callback({ access_token: 'injected-token' });
                  else if (${JSON.stringify(failure)} === "access_denied")
                    options.callback({ error: 'access_denied' });
                  else options.error_callback({ type: ${JSON.stringify(failure)} });
                } };
              } } } };
              // Cancel Picker after successful authorization, without touching Drive.
              window.google.picker = {
                ViewId: { DOCS: 'docs' }, Action: { CANCEL: 'cancel' },
                Response: { ACTION: 'action', DOCUMENTS: 'documents' }, Document: {},
                DocsView: class { setMimeTypes() { return this; } },
                PickerBuilder: class {
                  setDeveloperKey() { return this; } setAppId() { return this; }
                  setOAuthToken() { return this; } addView() { return this; }
                  setCallback(cb) { this.cb = cb; return this; }
                  build() { return { setVisible: () => { window.pickerCancelled = true; this.cb({ action: 'cancel' }); } }; }
                }
              };
            `,
            });
          }
          if (url === "https://apis.google.com/js/api.js")
            return route.fulfill({
              contentType: "text/javascript",
              body: "window.gapi = { load: (_, options) => options.callback() };",
            });
          throw new Error(`Unexpected external request: ${url}`);
        });

        await page.goto(origin);

        const open = page.getByRole("button", {
          name: "Open from Google Drive",
          exact: true,
        });
        await open.waitFor();
        assert.equal(
          googleRequests,
          0,
          "Google must remain unloaded before a Drive action",
        );

        await open.click();
        await page
          .getByText("Google Drive open failed", { exact: true })
          .waitFor();
        await page.waitForFunction(
          () => !document.querySelector('button[data-loading="true"]'),
        );
        assert.equal(await open.isEnabled(), true);
        if (!blocked)
          assert.equal(await page.evaluate("window.authAttempts"), 1);
        // Local SVG import must still work after the Drive failure.
        await page.getByLabel("Choose an SVG file").setInputFiles({
          name: "local.svg",
          mimeType: "image/svg+xml",
          buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><text id="name">Local remains usable</text></svg>',
          ),
        });
        await page
          .frameLocator('iframe[title="SVG preview"]')
          .getByText("Local remains usable")
          .waitFor();
        blocked = false;

        await open.click();
        await page.waitForFunction("window.pickerCancelled === true");
        assert.equal(await open.isEnabled(), true);
        await page
          .frameLocator('iframe[title="SVG preview"]')
          .getByText("Local remains usable")
          .waitFor();
        console.log(
          `${engine.name()}: ${failure}, local import and explicit retry passed`,
        );

        await context.close();
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        await browser.close();
      }
    }
  }
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await rm(folder, { recursive: true, force: true });
}
