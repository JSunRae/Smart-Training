import OpenAI from "openai";

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({ apiKey, baseURL: process.env.OPENAI_API_BASE_URL });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();

  console.log("Usage reporting placeholder", { start, end });
  console.log("Integrate the latest OpenAI usage endpoint here for your selected models.");
  await client.models.list();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
