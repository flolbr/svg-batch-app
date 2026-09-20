import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const packageMetadata = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version?: unknown };
const appVersion =
  typeof packageMetadata.version === "string" && packageMetadata.version.trim()
    ? packageMetadata.version.trim()
    : "0.0.0";
const appId = "svg-batch-generator";

export default defineConfig(({ mode }) => ({
  base: "./",
  define: {
    __APP_ID__: JSON.stringify(appId),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    {
      name: "svg-batch-application-metadata",
      transformIndexHtml(html: string) {
        return {
          html,
          tags: [
            {
              tag: "meta",
              attrs: {
                content: appId,
                name: "svg-batch-app-id",
              },
              injectTo: "head-prepend",
            },
            {
              tag: "meta",
              attrs: {
                content: appVersion,
                name: "svg-batch-app-version",
              },
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
    react(),
    ...(mode === "single"
      ? [
          viteSingleFile({
            removeViteModuleLoader: true,
          }),
        ]
      : []),
  ],
  build: {
    cssCodeSplit: false,
    sourcemap: false,
    assetsInlineLimit: 100_000_000,
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
}));
