import { defineConfig } from "@playwright/test";

const e2eStorePath = "./data/e2e-store.json";
const encryptionKey =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        APP_SESSION_SECRET: "playwright-session-secret",
        DATA_ENCRYPTION_KEY: encryptionKey,
        SMART_TRAINING_DB_PATH: e2eStorePath
      }
    },
    {
      command: "pnpm --filter web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        INTERNAL_API_ORIGIN: "http://localhost:3001",
        NEXT_PUBLIC_API_ORIGIN: "http://localhost:3001"
      }
    }
  ]
});
