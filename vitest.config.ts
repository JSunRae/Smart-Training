import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "apps/api/src"),
      "@core": path.resolve(projectRoot, "packages/core/src")
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"]
  }
});
