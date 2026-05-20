import path from "node:path";

export function getDatabaseUrl(): null | string {
  const configured = process.env.DATABASE_URL?.trim();
  return configured ? configured : null;
}

export function getStorageBackend(): "file" | "postgres" {
  return getDatabaseUrl() ? "postgres" : "file";
}

export function resolveFileStorePath(): string {
  const configured = process.env.SMART_TRAINING_DB_PATH?.trim();
  const fileName = configured
    ? path.basename(configured.replace(/\\/g, "/"))
    : "store.json";

  return path.join(process.cwd(), "data", fileName);
}
