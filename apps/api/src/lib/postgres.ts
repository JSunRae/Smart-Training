import type { Pool as PgPool, PoolClient } from "pg";

import { getDatabaseUrl } from "./database-config";
import { getSessionRetentionDays } from "./env";

type PostgresRuntime = {
  pool: PgPool;
  ready: Promise<void>;
  url: string;
};

declare global {
  var __smartTrainingPostgresRuntime__: PostgresRuntime | undefined;
}

export async function withPostgres<T>(
  callback: (pool: PgPool) => Promise<T>
): Promise<T> {
  const runtime = await getPostgresRuntime();
  await runtime.ready;
  return callback(runtime.pool);
}

export async function withPostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const runtime = await getPostgresRuntime();
  await runtime.ready;

  const client = await runtime.pool.connect();
  try {
    await client.query("BEGIN");
    await pruneExpiredSessions(client);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPostgresRuntime(): Promise<void> {
  const runtime = globalThis.__smartTrainingPostgresRuntime__;
  if (!runtime) {
    return;
  }

  delete globalThis.__smartTrainingPostgresRuntime__;
  await runtime.pool.end();
}

async function getPostgresRuntime(): Promise<PostgresRuntime> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required for the Postgres backend.");
  }

  const existing = globalThis.__smartTrainingPostgresRuntime__;
  if (existing?.url === url) {
    return existing;
  }

  if (existing) {
    await existing.pool.end();
  }

  const pool = await createPool(url);
  const runtime: PostgresRuntime = {
    url,
    pool,
    ready: ensureSchema(pool)
  };
  globalThis.__smartTrainingPostgresRuntime__ = runtime;
  return runtime;
}

async function createPool(url: string): Promise<PgPool> {
  if (url.startsWith("pg-mem://")) {
    const { newDb } = await import("pg-mem");
    const database = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = database.adapters.createPg();
    return new adapter.Pool();
  }

  const { Pool } = await import("pg");
  return new Pool({
    connectionString: url
  });
}

async function ensureSchema(pool: PgPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      email_lookup_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TRAINER', 'SELLER')),
      transcript_consent_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_active BOOLEAN NOT NULL,
      buyer_company TEXT NOT NULL,
      buyer_role TEXT NOT NULL,
      buyer_tone TEXT NOT NULL,
      challenge TEXT NOT NULL,
      goal TEXT NOT NULL,
      opening_line TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      organization_id TEXT NULL REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ NULL,
      coach_intervention_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE RESTRICT,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('SYSTEM', 'USER', 'ASSISTANT', 'COACH')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('FILE', 'URL', 'NOTE')),
      content TEXT NULL,
      summary TEXT NULL,
      source_url TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      organization_id TEXT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      scenario_id TEXT NULL REFERENCES scenarios(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limit_windows (
      bucket TEXT NOT NULL,
      identifier TEXT NOT NULL,
      attempt_count INTEGER NOT NULL,
      window_started_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (bucket, identifier)
    );

    CREATE INDEX IF NOT EXISTS users_organization_id_idx
      ON users (organization_id);
    CREATE INDEX IF NOT EXISTS scenarios_organization_id_idx
      ON scenarios (organization_id);
    CREATE INDEX IF NOT EXISTS sessions_user_organization_idx
      ON sessions (user_id, organization_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_status_updated_idx
      ON sessions (status, updated_at);
    CREATE INDEX IF NOT EXISTS messages_session_created_idx
      ON messages (session_id, created_at);
    CREATE INDEX IF NOT EXISTS documents_scenario_id_idx
      ON documents (scenario_id);
    CREATE INDEX IF NOT EXISTS rate_limit_windows_expires_at_idx
      ON rate_limit_windows (expires_at);
  `);

  await pruneExpiredSessions(pool);
}

async function pruneExpiredSessions(executor: PgPool | PoolClient): Promise<void> {
  const retentionDays = getSessionRetentionDays();
  if (!retentionDays) {
    return;
  }

  await executor.query(
    `
      DELETE FROM sessions
      WHERE status <> 'ACTIVE'
        AND COALESCE(ended_at, updated_at) < NOW() - (($1::text || ' days')::interval)
    `,
    [retentionDays]
  );
}
