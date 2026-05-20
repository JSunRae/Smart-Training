import { getStorageBackend } from "../src/lib/database-config";
import { ensureSeedData } from "../src/lib/repository";

async function main() {
  await ensureSeedData();
  console.log(`Seeded baseline scenarios into the ${getStorageBackend()} backend.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
