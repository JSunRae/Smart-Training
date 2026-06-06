import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "apps/api/src"),
      "@core": path.resolve(rootDirectory, "packages/core/src"),
      "@prompts": path.resolve(rootDirectory, "packages/prompts")
    }
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "scripts/**/*.test.{js,mjs,ts}"
    ]
  }
});
