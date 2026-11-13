import { defineConfig } from "@playwright/test";

const e2eStorePath = "./data/e2e-store.json";
const host = "127.0.0.1";
const webOrigin = `http://${host}:3000`;
const apiOrigin = `http://${host}:3001`;
const encryptionKey =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: webOrigin,
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: `pnpm --filter api dev --hostname ${host}`,
      url: `${apiOrigin}/api/health`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: "",
        PILOT_ACCESS_MODE: "workspace",
        OPENAI_API_KEY: "",
        OPENAI_TEXT_ENABLED: "false",
        VOICE_LAB_ENABLED: "false",
        SESSION_RETENTION_DAYS: "30",
        APP_SESSION_SECRET: "playwright-session-secret",
        DATA_ENCRYPTION_KEY: encryptionKey,
        SMART_TRAINING_DB_PATH: e2eStorePath
      }
    },
    {
      command: `pnpm --filter web dev --hostname ${host} --port 3000`,
      url: webOrigin,
      reuseExistingServer: false,
      env: {
        NETLIFY: "false",
        SMART_TRAINING_SITE_MODE: "workspace",
        INTERNAL_API_ORIGIN: apiOrigin,
        NEXT_PUBLIC_API_ORIGIN: apiOrigin
      }
    }
  ]
});
