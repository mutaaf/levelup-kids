import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

// Per docs/LESSONS (cross-fleet): vitest specs MUST live as `*.test.ts` so the
// `*.spec.ts` suffix can be reserved for Playwright (e2e/). The exclude below
// keeps Playwright specs out of the unit suite.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      "playwright-report/**",
      "test-results/**",
      "**/*.spec.ts",
    ],
    globals: false,
  },
});
