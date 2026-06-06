import path from "node:path";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { resetPostgresRuntime, withPostgres, withPostgresTransaction } from "./postgres";
import { deleteAccountData } from "./repository";
import { readDatabase, resetDatabase, type Database } from "./store";

describe("privacy contract", () => {
  afterEach(async () => {
    const storeFileName = process.env.SMART_TRAINING_DB_PATH;

    delete process.env.DATABASE_URL;
    delete process.env.SMART_TRAINING_DB_PATH;
    delete process.env.APP_SESSION_SECRET;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.SESSION_RETENTION_DAYS;

    await resetPostgresRuntime();

    if (storeFileName) {
      await rm(path.join(process.cwd(), "data", storeFileName), { force: true });
    }
  });

  it("deletes only the target account transcript history immediately when the org still has members", async () => {
    process.env.SMART_TRAINING_DB_PATH = `privacy-contract-${randomUUID()}.json`;

    await resetDatabase({
      organizations: [
        {
          id: "org-1",
          name: "Northwind",
          slug: "northwind",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z"
        }
      ],
      users: [
        {
          id: "user-1",
          email: "owner@example.com",
          name: "Owner",
          passwordHash: "salt:hash",
          role: "ADMIN",
          transcriptConsentAt: "2026-05-15T00:00:00.000Z",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          organizationId: "org-1"
        },
        {
          id: "user-2",
          email: "teammate@example.com",
          name: "Teammate",
          passwordHash: "salt:hash",
          role: "SELLER",
          transcriptConsentAt: "2026-05-15T00:00:00.000Z",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          organizationId: "org-1"
        }
      ],
      scenarios: [
        {
          id: "scenario-global",
          key: "global",
          title: "Global Scenario",
          description: "Shared",
          isActive: true,
          buyerCompany: "Buyer Co",
          buyerRole: "Buyer",
          buyerTone: "Curious",
          challenge: "Challenge",
          goal: "Goal",
          openingLine: "Opening",
          organizationId: null,
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z"
        },
        {
          id: "scenario-org",
          key: "org",
          title: "Org Scenario",
          description: "Custom",
          isActive: true,
          buyerCompany: "Buyer Co",
          buyerRole: "Buyer",
          buyerTone: "Direct",
          challenge: "Challenge",
          goal: "Goal",
          openingLine: "Opening",
          organizationId: "org-1",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z"
        }
      ],
      sessions: [
        {
          id: "session-1",
          status: "ACTIVE",
          startedAt: "2026-05-15T00:00:00.000Z",
          endedAt: null,
          coachInterventionCount: 0,
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          userId: "user-1",
          scenarioId: "scenario-org",
          organizationId: "org-1"
        },
        {
          id: "session-2",
          status: "ACTIVE",
          startedAt: "2026-05-15T00:00:00.000Z",
          endedAt: null,
          coachInterventionCount: 0,
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          userId: "user-2",
          scenarioId: "scenario-org",
          organizationId: "org-1"
        }
      ],
      messages: [
        {
          id: "message-1",
          role: "ASSISTANT",
          content: "Deleted user transcript",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          sessionId: "session-1"
        },
        {
          id: "message-2",
          role: "ASSISTANT",
          content: "Remaining user transcript",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          sessionId: "session-2"
        }
      ],
      documents: [
        {
          id: "document-global",
          title: "Global Doc",
          type: "NOTE",
          content: "Shared note",
          summary: "Shared",
          sourceUrl: null,
          organizationId: null,
          scenarioId: "scenario-global",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z"
        },
        {
          id: "document-org",
          title: "Org Doc",
          type: "NOTE",
          content: "Custom note",
          summary: "Custom",
          sourceUrl: null,
          organizationId: "org-1",
          scenarioId: "scenario-org",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z"
        }
      ]
    } satisfies Database);

    await deleteAccountData("user-1", "org-1");

    const database = await readDatabase();

    expect(database.users.map((user) => user.id)).toEqual(["user-2"]);
    expect(database.sessions.map((session) => session.id)).toEqual(["session-2"]);
    expect(database.messages.map((message) => message.id)).toEqual(["message-2"]);
    expect(database.organizations.map((organization) => organization.id)).toEqual(["org-1"]);
    expect(database.scenarios.map((scenario) => scenario.id).sort()).toEqual([
      "scenario-global",
      "scenario-org"
    ]);
    expect(database.documents.map((document) => document.id).sort()).toEqual([
      "document-global",
      "document-org"
    ]);
  });

  it("deletes org-owned assets when the deleted account is the last org member in postgres", async () => {
    process.env.DATABASE_URL = `pg-mem://${randomUUID()}`;
    process.env.APP_SESSION_SECRET = "test-session-secret";
    process.env.DATA_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    await withPostgres(async (pool) => {
      await pool.query(
        `
          INSERT INTO organizations (id, name, slug, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        ["org-1", "Northwind", "northwind", nowIso(), nowIso()]
      );

      await pool.query(
        `
          INSERT INTO users (
            id,
            email,
            email_lookup_hash,
            name,
            password_hash,
            role,
            transcript_consent_at,
            created_at,
            updated_at,
            organization_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          "user-1",
          "owner@example.com",
          "owner-hash",
          "Owner",
          "salt:hash",
          "ADMIN",
          nowIso(),
          nowIso(),
          nowIso(),
          "org-1"
        ]
      );

      await pool.query(
        `
          INSERT INTO scenarios (
            id,
            key,
            title,
            description,
            is_active,
            buyer_company,
            buyer_role,
            buyer_tone,
            challenge,
            goal,
            opening_line,
            created_at,
            updated_at,
            organization_id
          )
          VALUES
            ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, $10, $11, $12, NULL),
            ($13, $14, $15, $16, TRUE, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        `,
        [
          "scenario-global",
          "global",
          "Global Scenario",
          "Shared",
          "Buyer Co",
          "Buyer",
          "Curious",
          "Challenge",
          "Goal",
          "Opening",
          nowIso(),
          nowIso(),
          "scenario-org",
          "org",
          "Org Scenario",
          "Custom",
          "Buyer Co",
          "Buyer",
          "Direct",
          "Challenge",
          "Goal",
          "Opening",
          nowIso(),
          nowIso(),
          "org-1"
        ]
      );

      await pool.query(
        `
          INSERT INTO sessions (
            id,
            status,
            started_at,
            ended_at,
            coach_intervention_count,
            created_at,
            updated_at,
            user_id,
            scenario_id,
            organization_id
          )
          VALUES ($1, 'ACTIVE', $2, NULL, 0, $2, $2, $3, $4, $5)
        `,
        ["session-1", nowIso(), "user-1", "scenario-org", "org-1"]
      );

      await pool.query(
        `
          INSERT INTO messages (id, role, content, created_at, updated_at, session_id)
          VALUES ($1, 'ASSISTANT', $2, $3, $3, $4)
        `,
        ["message-1", "Transcript", nowIso(), "session-1"]
      );

      await pool.query(
        `
          INSERT INTO documents (
            id,
            title,
            type,
            content,
            summary,
            source_url,
            created_at,
            updated_at,
            organization_id,
            scenario_id
          )
          VALUES
            ($1, $2, 'NOTE', $3, $4, NULL, $5, $5, NULL, $6),
            ($7, $8, 'NOTE', $9, $10, NULL, $11, $11, $12, $13)
        `,
        [
          "document-global",
          "Global Doc",
          "Shared note",
          "Shared",
          nowIso(),
          "scenario-global",
          "document-org",
          "Org Doc",
          "Custom note",
          "Custom",
          nowIso(),
          "org-1",
          "scenario-org"
        ]
      );
    });

    await deleteAccountData("user-1", "org-1");

    await withPostgres(async (pool) => {
      const counts = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM organizations`),
        pool.query(`SELECT COUNT(*)::int AS count FROM users`),
        pool.query(`SELECT COUNT(*)::int AS count FROM sessions`),
        pool.query(`SELECT COUNT(*)::int AS count FROM messages`),
        pool.query(`SELECT id FROM scenarios ORDER BY id ASC`),
        pool.query(`SELECT id FROM documents ORDER BY id ASC`)
      ]);

      expect(counts[0].rows[0]?.count).toBe(0);
      expect(counts[1].rows[0]?.count).toBe(0);
      expect(counts[2].rows[0]?.count).toBe(0);
      expect(counts[3].rows[0]?.count).toBe(0);
      expect(counts[4].rows.map((row) => String(row.id))).toEqual(["scenario-global"]);
      expect(counts[5].rows.map((row) => String(row.id))).toEqual(["document-global"]);
    });
  });

  it("applies transcript retention only to expired non-active sessions in postgres", async () => {
    process.env.DATABASE_URL = `pg-mem://${randomUUID()}`;
    process.env.APP_SESSION_SECRET = "test-session-secret";
    process.env.DATA_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.SESSION_RETENTION_DAYS = "30";

    await withPostgres(async (pool) => {
      await pool.query(
        `
          INSERT INTO organizations (id, name, slug, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        ["org-1", "Northwind", "northwind", nowIso(), nowIso()]
      );

      await pool.query(
        `
          INSERT INTO users (
            id,
            email,
            email_lookup_hash,
            name,
            password_hash,
            role,
            transcript_consent_at,
            created_at,
            updated_at,
            organization_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          "user-1",
          "owner@example.com",
          "owner-hash",
          "Owner",
          "salt:hash",
          "ADMIN",
          nowIso(),
          nowIso(),
          nowIso(),
          "org-1"
        ]
      );

      await pool.query(
        `
          INSERT INTO scenarios (
            id,
            key,
            title,
            description,
            is_active,
            buyer_company,
            buyer_role,
            buyer_tone,
            challenge,
            goal,
            opening_line,
            created_at,
            updated_at,
            organization_id
          )
          VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, $10, $11, $12, NULL)
        `,
        [
          "scenario-global",
          "global",
          "Global Scenario",
          "Shared",
          "Buyer Co",
          "Buyer",
          "Curious",
          "Challenge",
          "Goal",
          "Opening",
          nowIso(),
          nowIso()
        ]
      );

      await pool.query(
        `
          INSERT INTO sessions (
            id,
            status,
            started_at,
            ended_at,
            coach_intervention_count,
            created_at,
            updated_at,
            user_id,
            scenario_id,
            organization_id
          )
          VALUES
            ($1, 'COMPLETED', $2, $3, 0, $2, $3, $4, $5, $6),
            ($7, 'ABANDONED', $8, NULL, 0, $8, $9, $10, $11, $12),
            ($13, 'ACTIVE', $14, NULL, 0, $14, $15, $16, $17, $18),
            ($19, 'COMPLETED', $20, $21, 0, $20, $21, $22, $23, $24)
        `,
        [
          "expired-completed",
          "2025-01-01T00:00:00.000Z",
          "2025-01-02T00:00:00.000Z",
          "user-1",
          "scenario-global",
          "org-1",
          "expired-abandoned",
          "2025-01-05T00:00:00.000Z",
          "2025-01-06T00:00:00.000Z",
          "user-1",
          "scenario-global",
          "org-1",
          "active-session",
          "2025-01-10T00:00:00.000Z",
          "2025-01-11T00:00:00.000Z",
          "user-1",
          "scenario-global",
          "org-1",
          "recent-completed",
          nowIso(),
          nowIso(),
          "user-1",
          "scenario-global",
          "org-1"
        ]
      );

      await pool.query(
        `
          INSERT INTO messages (id, role, content, created_at, updated_at, session_id)
          VALUES
            ($1, 'ASSISTANT', $2, $3, $3, $4),
            ($5, 'ASSISTANT', $6, $7, $7, $8),
            ($9, 'ASSISTANT', $10, $11, $11, $12),
            ($13, 'ASSISTANT', $14, $15, $15, $16)
        `,
        [
          "message-expired-completed",
          "Expired completed",
          nowIso(),
          "expired-completed",
          "message-expired-abandoned",
          "Expired abandoned",
          nowIso(),
          "expired-abandoned",
          "message-active",
          "Active session",
          nowIso(),
          "active-session",
          "message-recent",
          "Recent completed",
          nowIso(),
          "recent-completed"
        ]
      );
    });

    await withPostgresTransaction(async () => undefined);

    await withPostgres(async (pool) => {
      const sessions = await pool.query(`SELECT id FROM sessions ORDER BY id ASC`);
      const messages = await pool.query(`SELECT session_id FROM messages ORDER BY session_id ASC`);

      expect(sessions.rows.map((row) => String(row.id))).toEqual([
        "active-session",
        "recent-completed"
      ]);
      expect(messages.rows.map((row) => String(row.session_id))).toEqual([
        "active-session",
        "recent-completed"
      ]);
    });
  });
});

function nowIso(): string {
  return new Date().toISOString();
}