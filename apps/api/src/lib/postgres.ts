import type { Pool as PgPool, PoolClient } from "pg";

import { getDatabaseUrl } from "./database-config";
import { getSessionRetentionDays } from "./env";

type PostgresRuntime = {
  ready: Promise<PgPool>;
  url: string;
};

const SMART_TRAINING_SCHEMA_LOCK_ID = 1_983_611_252;

declare global {
  var __smartTrainingPostgresRuntime__: PostgresRuntime | undefined;
}

export async function withPostgres<T>(callback: (pool: PgPool) => Promise<T>): Promise<T> {
  return callback(await getPostgresPool());
}

export async function ensurePostgresSchemaReady(): Promise<void> {
  await getPostgresPool();
}

export async function withPostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getPostgresPool();
  const client = await pool.connect();
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
  const pool = await runtime.ready.catch(() => undefined);
  await pool?.end();
}

function getPostgresPool(): Promise<PgPool> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required for the Postgres backend.");
  }

  const existing = globalThis.__smartTrainingPostgresRuntime__;
  if (existing?.url === url) {
    return existing.ready;
  }

  const ready = initializePostgres(url, existing?.ready);
  globalThis.__smartTrainingPostgresRuntime__ = { url, ready };
  void ready.catch(() => {
    if (globalThis.__smartTrainingPostgresRuntime__?.ready === ready) {
      delete globalThis.__smartTrainingPostgresRuntime__;
    }
  });
  return ready;
}

async function initializePostgres(url: string, previous?: Promise<PgPool>): Promise<PgPool> {
  const previousPool = await previous?.catch(() => undefined);
  await previousPool?.end();
  const inMemory = url.startsWith("pg-mem://");
  const pool = await createPool(url, inMemory);
  try {
    await ensureSchema(pool, inMemory);
    return pool;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

async function createPool(url: string, inMemory: boolean): Promise<PgPool> {
  if (inMemory) {
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

async function ensureSchema(pool: PgPool, inMemory: boolean): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!inMemory) {
      // Concurrent CREATE TABLE IF NOT EXISTS calls can race in the Postgres catalog.
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [SMART_TRAINING_SCHEMA_LOCK_ID]);
    }
    await applySchema(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await pruneExpiredSessions(pool);
}

async function applySchema(client: PoolClient): Promise<void> {
  await client.query(`
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
      access_state TEXT NOT NULL DEFAULT 'unapproved',
      session_version INTEGER NOT NULL DEFAULT 0,
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

  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS access_state TEXT NOT NULL DEFAULT 'unapproved';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

    CREATE TABLE IF NOT EXISTS pilot_invitations (
      token_hash TEXT PRIMARY KEY,
      email_lookup_hash TEXT NOT NULL UNIQUE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SELLER')),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pilot_invitations_expiry_idx ON pilot_invitations (expires_at);

    CREATE TABLE IF NOT EXISTS pilot_password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pilot_password_resets_expiry_idx ON pilot_password_resets (expires_at);
  `);
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
