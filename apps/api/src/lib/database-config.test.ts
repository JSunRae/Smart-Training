import { afterEach, describe, expect, it } from "vitest";

import { getStorageBackend, resolveFileStorePath } from "./database-config";

describe("database backend selection", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowFileStorageInProduction = process.env.ALLOW_FILE_STORAGE_IN_PRODUCTION;
  const originalDbPath = process.env.SMART_TRAINING_DB_PATH;

  afterEach(() => {
    restoreEnv("DATABASE_URL", originalDatabaseUrl);
    restoreEnv("NODE_ENV", originalNodeEnv);
    restoreEnv("ALLOW_FILE_STORAGE_IN_PRODUCTION", originalAllowFileStorageInProduction);
    restoreEnv("SMART_TRAINING_DB_PATH", originalDbPath);
  });

  it("uses file storage by default outside production", () => {
    clearEnv("DATABASE_URL");
    setEnv("NODE_ENV", "test");

    expect(getStorageBackend()).toBe("file");
  });

  it("uses postgres when DATABASE_URL is configured", () => {
    setEnv("DATABASE_URL", "postgres://pilot:pilot@localhost:5432/smart_training");
    setEnv("NODE_ENV", "production");

    expect(getStorageBackend()).toBe("postgres");
  });

  it("fails fast in production when DATABASE_URL is missing", () => {
    clearEnv("DATABASE_URL");
    setEnv("NODE_ENV", "production");

    expect(() => getStorageBackend()).toThrow(
      "DATABASE_URL must be configured in production. Set ALLOW_FILE_STORAGE_IN_PRODUCTION=true only for an intentional file-backed production run."
    );
    expect(() => resolveFileStorePath()).toThrow(
      "DATABASE_URL must be configured in production. Set ALLOW_FILE_STORAGE_IN_PRODUCTION=true only for an intentional file-backed production run."
    );
  });

  it("allows an explicit production file-store override", () => {
    clearEnv("DATABASE_URL");
    setEnv("NODE_ENV", "production");
    setEnv("ALLOW_FILE_STORAGE_IN_PRODUCTION", "true");
    setEnv("SMART_TRAINING_DB_PATH", "pilot-store.json");

    expect(getStorageBackend()).toBe("file");
    expect(resolveFileStorePath()).toContain("pilot-store.json");
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
