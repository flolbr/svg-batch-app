import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
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
