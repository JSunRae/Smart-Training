import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { resetPostgresRuntime, withPostgres } from "./postgres";
import { ensureSeedData } from "./repository";

describe("ensureSeedData", () => {
  afterEach(async () => {
    delete process.env.DATABASE_URL;
    await resetPostgresRuntime();
  });

  it("reports insertion only for the first seed run on an empty postgres backend", async () => {
    process.env.DATABASE_URL = `pg-mem://${randomUUID()}`;

    const firstResult = await ensureSeedData();
    expect(firstResult).toEqual({
      backend: "postgres",
      inserted: true,
      seedDocumentCount: expect.any(Number),
      seedScenarioCount: expect.any(Number)
    });

    await expect(readSeedCounts()).resolves.toEqual({
      documents: firstResult.seedDocumentCount,
      scenarios: firstResult.seedScenarioCount
    });

    const secondResult = await ensureSeedData();
    expect(secondResult).toEqual({
      ...firstResult,
      inserted: false
    });

    await expect(readSeedCounts()).resolves.toEqual({
      documents: firstResult.seedDocumentCount,
      scenarios: firstResult.seedScenarioCount
    });
  });
});

async function readSeedCounts() {
  return withPostgres(async (pool) => {
    const [scenarioResult, documentResult] = await Promise.all([
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM scenarios`),
      pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM documents`)
    ]);

    return {
      documents: Number(documentResult.rows[0]?.count ?? 0),
      scenarios: Number(scenarioResult.rows[0]?.count ?? 0)
    };
  });
}
