import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    // Used from Phase 2 onward: same-origin cookies in development.
    proxy: { "/api": "http://localhost:8000", "/media": "http://localhost:8000" },
  },
  preview: { proxy: { "/api": "http://localhost:8000", "/media": "http://localhost:8000" } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: false,
  },
});
