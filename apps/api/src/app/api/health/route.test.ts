import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalOpenAiTextEnabled = process.env.OPENAI_TEXT_ENABLED;
  const originalVoiceLabEnabled = process.env.VOICE_LAB_ENABLED;
  const originalAllowFileStorageInProduction = process.env.ALLOW_FILE_STORAGE_IN_PRODUCTION;

  beforeEach(() => {
    clearEnv("DATABASE_URL");
    clearEnv("NODE_ENV");
    clearEnv("OPENAI_API_KEY");
    clearEnv("OPENAI_TEXT_ENABLED");
    clearEnv("VOICE_LAB_ENABLED");
    clearEnv("ALLOW_FILE_STORAGE_IN_PRODUCTION");
  });

  afterEach(() => {
    restoreEnv("DATABASE_URL", originalDatabaseUrl);
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("OPENAI_API_KEY", originalOpenAiApiKey);
    restoreEnv("OPENAI_TEXT_ENABLED", originalOpenAiTextEnabled);
    restoreEnv("VOICE_LAB_ENABLED", originalVoiceLabEnabled);
    restoreEnv("ALLOW_FILE_STORAGE_IN_PRODUCTION", originalAllowFileStorageInProduction);
  });

  it("returns the default operational health contract", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      storageBackend: "file",
      openAiApiConfigured: false,
      openAiTextEnabled: false,
      voiceLabEnabled: false
    });
  });

  it("reports OpenAI credentials separately from disabled feature flags", async () => {
    setEnv("OPENAI_API_KEY", "sk-test");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      storageBackend: "file",
      openAiApiConfigured: true,
      openAiTextEnabled: false,
      voiceLabEnabled: false
    });
  });

  it("returns the hosted launch posture keys and values", async () => {
    setEnv("DATABASE_URL", "postgres://pilot:pilot@localhost:5432/smart_training");
    setEnv("OPENAI_API_KEY", "sk-test");
    setEnv("OPENAI_TEXT_ENABLED", "true");
    setEnv("VOICE_LAB_ENABLED", "true");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      storageBackend: "postgres",
      openAiApiConfigured: true,
      openAiTextEnabled: true,
      voiceLabEnabled: true
    });
  });

  it("fails fast in production when DATABASE_URL is missing", async () => {
    setEnv("NODE_ENV", "production");

    await expect(GET()).rejects.toThrow(
      "DATABASE_URL must be configured in production. Set ALLOW_FILE_STORAGE_IN_PRODUCTION=true only for an intentional file-backed production run."
    );
  });
});

type MutableProcessEnv = Record<string, string | undefined>;

function clearEnv(name: string) {
  delete (process.env as MutableProcessEnv)[name];
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    clearEnv(name);
    return;
  }

  setEnv(name, value);
}

function setEnv(name: string, value: string) {
  (process.env as MutableProcessEnv)[name] = value;
}
