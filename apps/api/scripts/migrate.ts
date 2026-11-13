import { getStorageBackend } from "../src/lib/database-config";
import { ensurePostgresSchemaReady, resetPostgresRuntime } from "../src/lib/postgres";
import { readDatabase } from "../src/lib/store";

async function main() {
  const backend = getStorageBackend();

  if (backend === "postgres") {
    try {
      await ensurePostgresSchemaReady();
    } finally {
      await resetPostgresRuntime();
    }
    console.log(
      "Postgres schema bootstrap completed, including additive pilot access columns and credential tables."
    );
    return;
  }

  await readDatabase();
  console.log("File-backed store bootstrap completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
