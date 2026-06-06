import { getStorageBackend } from "../src/lib/database-config";
import { ensureSeedData } from "../src/lib/repository";

async function main() {
  const result = await ensureSeedData();
  const backend = getStorageBackend();

  if (result.inserted) {
    console.log(
      `Inserted ${result.seedScenarioCount} baseline scenarios and ${result.seedDocumentCount} supporting documents into the ${backend} backend.`
    );
    return;
  }

  console.log(
    `Skipped seeding for the ${backend} backend because scenario records already exist. Seed only inserts the baseline library into an empty backend.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
