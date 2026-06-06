import { getStorageBackend } from "../src/lib/database-config";
import { ensurePostgresSchemaReady } from "../src/lib/postgres";
import { readDatabase } from "../src/lib/store";

async function main() {
  const backend = getStorageBackend();

  if (backend === "postgres") {
    await ensurePostgresSchemaReady();
    console.log(
      "Postgres schema bootstrap completed. Existing tables and indexes were left in place; no versioned migrations were applied."
    );
    return;
  }

  await readDatabase();
  console.log("File-backed store bootstrap completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
