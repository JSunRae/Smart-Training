import { getStorageBackend } from "../src/lib/database-config";
import { withPostgres } from "../src/lib/postgres";
import { readDatabase } from "../src/lib/store";

async function main() {
  const backend = getStorageBackend();

  if (backend === "postgres") {
    await withPostgres(async () => undefined);
    console.log("Postgres schema is ready.");
    return;
  }

  await readDatabase();
  console.log("File-backed store is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
