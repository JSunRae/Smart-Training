import path from "node:path";

import { isFileStoreProductionOverrideEnabled, isProduction } from "./env";

export function getDatabaseUrl(): null | string {
  const configured = process.env.DATABASE_URL?.trim();
  return configured ? configured : null;
}

export function getStorageBackend(): "file" | "postgres" {
  if (getDatabaseUrl()) {
    return "postgres";
  }

  assertFileStorageIsAllowed();
  return "file";
}

export function resolveFileStorePath(): string {
  assertFileStorageIsAllowed();

  const configured = process.env.SMART_TRAINING_DB_PATH?.trim();
  const fileName = configured
    ? path.basename(configured.replace(/\\/g, "/"))
    : "store.json";

  return path.join(process.cwd(), "data", fileName);
}

function assertFileStorageIsAllowed(): void {
  if (!isProduction()) {
    return;
  }

  if (isFileStoreProductionOverrideEnabled()) {
    return;
  }

  throw new Error(
    "DATABASE_URL must be configured in production. Set ALLOW_FILE_STORAGE_IN_PRODUCTION=true only for an intentional file-backed production run."
  );
}
