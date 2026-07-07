/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@dp-explorer/core": new URL("../../packages/core/src", import.meta.url).pathname,
      "@dp-explorer/playback": new URL("../../packages/playback/src", import.meta.url).pathname,
      "@dp-explorer/templates": new URL("../../packages/templates/src", import.meta.url).pathname,
      "@web": new URL("./src", import.meta.url).pathname
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./test/setup.ts"]
  }
});
