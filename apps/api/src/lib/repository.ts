import seedData from "../../data/seed-data.json";

import type { MessageRole } from "@core/contracts";
import type { Pool as PgPool, PoolClient } from "pg";

import type { SessionUser } from "./auth";
import {
  createLookupHash,
  decryptNullableString,
  decryptString,
  encryptNullableString,
  encryptString
} from "./data-protection";
import { getStorageBackend } from "./database-config";
import { withPostgres, withPostgresTransaction } from "./postgres";
import { slugify } from "./slug";
import {
  createId,
  nowIso,
  readDatabase,
  type AccountAccessState,
  type Database,
  type DocumentRecord,
  type MessageRecord,
  type OrganizationRecord,
  type ScenarioRecord,
  type SessionRecord,
  type UserRecord,
  updateDatabase
} from "./store";

export type HydratedSession = SessionRecord & {
  scenario: ScenarioRecord;
  messages: MessageRecord[];
};

export type HydratedSessionContext = HydratedSession & {
  documents: DocumentRecord[];
};

type SessionMessageInput = {
  content: string;
  role: MessageRole;
};

type RegisterAccountInput = {
  email: string;
  name: string;
  organizationName: string;
  passwordHash: string;
};

export type EnsureSeedDataResult = {
  backend: "file" | "postgres";
  inserted: boolean;
  seedDocumentCount: number;
  seedScenarioCount: number;
};

export async function getSessionUserById(
  userId: string,
  organizationId: string
): Promise<SessionUser | null> {
  if (getStorageBackend() === "postgres") {
    return getSessionUserByIdFromPostgres(userId, organizationId);
  }

  const database = await readDatabase();
  const user = database.users.find((entry) => entry.id === userId);
  if (!user || user.organizationId !== organizationId) {
    return null;
  }

  const organization = database.organizations.find((entry) => entry.id === user.organizationId);
  if (!organization) {
    return null;
  }

  return toSessionUser(user, organization);
}

export async function getAccountByEmail(email: string): Promise<{
  organization: OrganizationRecord;
  user: UserRecord;
} | null> {
  if (getStorageBackend() === "postgres") {
    return getAccountByEmailFromPostgres(email);
  }

  const database = await readDatabase();
  const user = database.users.find((entry) => entry.email === email);
  if (!user) {
    return null;
  }

  const organization = database.organizations.find((entry) => entry.id === user.organizationId);
  if (!organization) {
    return null;
  }

  return { user, organization };
}

export async function markTranscriptConsent(
  userId: string,
  organizationId: string
): Promise<SessionUser | null> {
  if (getStorageBackend() === "postgres") {
    return markTranscriptConsentFromPostgres(userId, organizationId);
  }

  return updateDatabase((database) => {
    const user = database.users.find(
      (entry) => entry.id === userId && entry.organizationId === organizationId
    );
    const organization = database.organizations.find((entry) => entry.id === organizationId);
    if (!user || !organization) {
      return null;
    }

    const timestamp = nowIso();
    user.transcriptConsentAt = timestamp;
    user.updatedAt = timestamp;

    return toSessionUser(user, organization);
  });
}

export async function registerAccount(
  input: RegisterAccountInput
): Promise<{ error: string; status: 409 } | { user: SessionUser }> {
  if (getStorageBackend() === "postgres") {
    return registerAccountInPostgres(input);
  }

  const slug = slugify(input.organizationName);
  return updateDatabase((database) => {
    const existingUser = database.users.find((entry) => entry.email === input.email);
    if (existingUser) {
      return { error: "An account already exists for this email address.", status: 409 } as const;
    }

    const timestamp = nowIso();
    const organization =
      database.organizations.find((entry) => entry.slug === slug) ??
      (() => {
        const nextOrganization: OrganizationRecord = {
          id: createId(),
          name: input.organizationName.trim(),
          slug,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        database.organizations.push(nextOrganization);
        return nextOrganization;
      })();

    const orgUserCount = database.users.filter(
      (entry) => entry.organizationId === organization.id
    ).length;
    const role: "ADMIN" | "SELLER" = orgUserCount === 0 ? "ADMIN" : "SELLER";
    const user: UserRecord = {
      id: createId(),
      email: input.email,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      role,
      transcriptConsentAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: organization.id,
      accessState: "unapproved",
      sessionVersion: 0
    };

    database.users.push(user);

    return { user: toSessionUser(user, organization) } as const;
  });
}

export async function deleteAccountData(userId: string, organizationId: string): Promise<void> {
  if (getStorageBackend() === "postgres") {
    await deleteAccountDataFromPostgres(userId, organizationId);
    return;
  }

  await updateDatabase((database) => {
    const sessionIds = new Set(
      database.sessions.filter((session) => session.userId === userId).map((session) => session.id)
    );

    database.messages = database.messages.filter((message) => !sessionIds.has(message.sessionId));
    database.sessions = database.sessions.filter((session) => session.userId !== userId);
    database.users = database.users.filter((entry) => entry.id !== userId);

    const remainingUsers = database.users.filter(
      (entry) => entry.organizationId === organizationId
    );
    if (remainingUsers.length === 0) {
      const deletedScenarioIds = new Set(
        database.scenarios
          .filter((scenario) => scenario.organizationId === organizationId)
          .map((scenario) => scenario.id)
      );

      database.organizations = database.organizations.filter(
        (entry) => entry.id !== organizationId
      );
      database.scenarios = database.scenarios.filter(
        (scenario) => scenario.organizationId !== organizationId
      );
      database.sessions = database.sessions.filter(
        (session) => session.organizationId !== organizationId
      );
      const remainingSessionIds = new Set(database.sessions.map((session) => session.id));
      database.messages = database.messages.filter((message) =>
        remainingSessionIds.has(message.sessionId)
      );
      database.documents = database.documents
        .filter((document) => document.organizationId !== organizationId)
        .map((document) =>
          document.scenarioId && deletedScenarioIds.has(document.scenarioId)
            ? { ...document, scenarioId: null }
            : document
        );
    }
  });
}

export async function ensureSeedData(): Promise<EnsureSeedDataResult> {
  if (getStorageBackend() === "postgres") {
    const inserted = await ensureSeedDataInPostgres();
    return {
      backend: "postgres",
      inserted,
      seedDocumentCount: seedData.documents.length,
      seedScenarioCount: seedData.scenarios.length
    };
  }

  const inserted = await updateDatabase((database) => {
    if (database.scenarios.length > 0) {
      return false;
    }

    seedDatabaseShape(database);
    return true;
  });

  return {
    backend: "file",
    inserted,
    seedDocumentCount: seedData.documents.length,
    seedScenarioCount: seedData.scenarios.length
  };
}

export async function listAccessibleScenarioRecords(
  organizationId: string
): Promise<ScenarioRecord[]> {
  if (getStorageBackend() === "postgres") {
    return listAccessibleScenarioRecordsFromPostgres(organizationId);
  }

  const database = await readDatabase();
  return database.scenarios
    .filter(
      (scenario) =>
        scenario.isActive &&
        (scenario.organizationId === null || scenario.organizationId === organizationId)
    )
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function getScenarioContext(
  scenarioId: string,
  organizationId: string
): Promise<{
  documents: DocumentRecord[];
  scenario: ScenarioRecord;
} | null> {
  if (getStorageBackend() === "postgres") {
    return getScenarioContextFromPostgres(scenarioId, organizationId);
  }

  const database = await readDatabase();
  const scenario = findAccessibleScenario(database, scenarioId, organizationId);
  if (!scenario) {
    return null;
  }

  return {
    scenario,
    documents: listAccessibleDocuments(database, scenario.id, organizationId)
  };
}

export async function listHydratedSessionSummaries(
  userId: string,
  organizationId: string
): Promise<HydratedSession[]> {
  if (getStorageBackend() === "postgres") {
    return listHydratedSessionSummariesFromPostgres(userId, organizationId);
  }

  const database = await readDatabase();
  return database.sessions
    .filter((session) => session.userId === userId && session.organizationId === organizationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((session) => buildHydratedSession(database, session))
    .filter((session): session is HydratedSession => session !== null);
}

export async function getHydratedSessionContext(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<HydratedSessionContext | null> {
  if (getStorageBackend() === "postgres") {
    return getHydratedSessionContextFromPostgres(sessionId, userId, organizationId);
  }

  const database = await readDatabase();
  const session = findAccessibleSession(database, sessionId, userId, organizationId);
  if (!session) {
    return null;
  }

  return {
    ...session,
    documents: listAccessibleDocuments(database, session.scenario.id, organizationId)
  };
}

export async function createSessionWithOpening(
  user: SessionUser,
  scenarioId: string,
  openingMessage: string
): Promise<HydratedSessionContext | null> {
  if (getStorageBackend() === "postgres") {
    return createSessionWithOpeningInPostgres(user, scenarioId, openingMessage);
  }

  return updateDatabase((database) => {
    const scenario = findAccessibleScenario(database, scenarioId, user.organizationId);
    if (!scenario) {
      return null;
    }

    const timestamp = nowIso();
    const session: SessionRecord = {
      id: createId(),
      status: "ACTIVE",
      startedAt: timestamp,
      endedAt: null,
      coachInterventionCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: user.id,
      scenarioId: scenario.id,
      organizationId: user.organizationId
    };
    database.sessions.push(session);
    database.messages.push({
      id: createId(),
      role: "ASSISTANT",
      content: openingMessage,
      createdAt: timestamp,
      updatedAt: timestamp,
      sessionId: session.id
    });

    const hydrated = buildHydratedSession(database, session);
    if (!hydrated) {
      return null;
    }

    return {
      ...hydrated,
      documents: listAccessibleDocuments(database, hydrated.scenario.id, user.organizationId)
    };
  });
}

export async function appendSessionMessages(
  sessionId: string,
  userId: string,
  organizationId: string,
  messages: SessionMessageInput[],
  coachDelta = 0
): Promise<HydratedSessionContext | null> {
  if (getStorageBackend() === "postgres") {
    return appendSessionMessagesInPostgres(sessionId, userId, organizationId, messages, coachDelta);
  }

  return updateDatabase((database) => {
    const session = database.sessions.find(
      (entry) =>
        entry.id === sessionId &&
        entry.userId === userId &&
        entry.organizationId === organizationId &&
        entry.status === "ACTIVE"
    );
    if (!session) {
      return null;
    }

    const timestamp = nowIso();
    session.updatedAt = timestamp;
    session.coachInterventionCount += coachDelta;

    for (const entry of messages) {
      database.messages.push({
        id: createId(),
        role: entry.role,
        content: entry.content,
        createdAt: timestamp,
        updatedAt: timestamp,
        sessionId
      });
    }

    const hydrated = buildHydratedSession(database, session);
    if (!hydrated) {
      return null;
    }

    return {
      ...hydrated,
      documents: listAccessibleDocuments(database, hydrated.scenario.id, organizationId)
    };
  });
}

export async function completeSessionRecord(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<HydratedSessionContext | null> {
  if (getStorageBackend() === "postgres") {
    return completeSessionRecordInPostgres(sessionId, userId, organizationId);
  }

  return updateDatabase((database) => {
    const session = database.sessions.find(
      (entry) =>
        entry.id === sessionId && entry.userId === userId && entry.organizationId === organizationId
    );
    if (!session) {
      return null;
    }

    if (session.status === "ACTIVE") {
      const timestamp = nowIso();
      session.status = "COMPLETED";
      session.endedAt = timestamp;
      session.updatedAt = timestamp;
    }

    const hydrated = buildHydratedSession(database, session);
    if (!hydrated) {
      return null;
    }

    return {
      ...hydrated,
      documents: listAccessibleDocuments(database, hydrated.scenario.id, organizationId)
    };
  });
}

export function toSessionUser(
  user: UserRecord,
  organization: Pick<OrganizationRecord, "id" | "name" | "slug">
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    role: user.role,
    accessState: user.accessState ?? "unapproved",
    sessionVersion: user.sessionVersion ?? 0,
    transcriptConsentAt: user.transcriptConsentAt ? new Date(user.transcriptConsentAt) : null,
    organization
  };
}

function seedDatabaseShape(database: Database): void {
  const timestamp = nowIso();
  const scenarioIdByKey = new Map<string, string>();

  for (const scenario of seedData.scenarios) {
    const id = createId();
    scenarioIdByKey.set(scenario.key, id);
    database.scenarios.push({
      id,
      key: scenario.key,
      title: scenario.title,
      description: scenario.description,
      isActive: true,
      buyerCompany: scenario.buyerCompany,
      buyerRole: scenario.buyerRole,
      buyerTone: scenario.buyerTone,
      challenge: scenario.challenge,
      goal: scenario.goal,
      openingLine: scenario.openingLine,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: null
    });
  }

  for (const document of seedData.documents) {
    const scenarioId = scenarioIdByKey.get(document.scenarioKey);
    if (!scenarioId) {
      continue;
    }

    database.documents.push({
      id: createId(),
      title: document.title,
      type: document.type as "FILE" | "URL" | "NOTE",
      content: document.content,
      summary: document.summary,
      sourceUrl: document.sourceUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: null,
      scenarioId
    });
  }
}

function findAccessibleScenario(database: Database, scenarioId: string, organizationId: string) {
  return database.scenarios.find(
    (scenario) =>
      scenario.id === scenarioId &&
      scenario.isActive &&
      (scenario.organizationId === null || scenario.organizationId === organizationId)
  );
}

function listAccessibleDocuments(
  database: Database,
  scenarioId: string,
  organizationId: string
): DocumentRecord[] {
  return database.documents.filter(
    (document) =>
      document.scenarioId === scenarioId &&
      (document.organizationId === null || document.organizationId === organizationId)
  );
}

function findAccessibleSession(
  database: Database,
  sessionId: string,
  userId: string,
  organizationId: string
) {
  const session = database.sessions.find(
    (entry) =>
      entry.id === sessionId && entry.userId === userId && entry.organizationId === organizationId
  );

  return session ? buildHydratedSession(database, session) : null;
}

function buildHydratedSession(database: Database, session: SessionRecord): HydratedSession | null {
  const scenario = database.scenarios.find((entry) => entry.id === session.scenarioId);
  if (!scenario) {
    return null;
  }

  const messages = database.messages
    .filter((message) => message.sessionId === session.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return {
    ...session,
    scenario,
    messages
  };
}

async function getSessionUserByIdFromPostgres(
  userId: string,
  organizationId: string
): Promise<SessionUser | null> {
  return withPostgres(async (pool) => {
    const result = await pool.query(
      `
        SELECT
          u.*,
          o.id AS organization_id_value,
          o.name AS organization_name,
          o.slug AS organization_slug,
          o.created_at AS organization_created_at,
          o.updated_at AS organization_updated_at
        FROM users u
        JOIN organizations o ON o.id = u.organization_id
        WHERE u.id = $1 AND u.organization_id = $2
        LIMIT 1
      `,
      [userId, organizationId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return toSessionUser(mapUserRow(row), mapOrganizationJoin(row));
  });
}

async function getAccountByEmailFromPostgres(email: string): Promise<{
  organization: OrganizationRecord;
  user: UserRecord;
} | null> {
  return withPostgres(async (pool) => {
    const result = await pool.query(
      `
        SELECT
          u.*,
          o.id AS organization_id_value,
          o.name AS organization_name,
          o.slug AS organization_slug,
          o.created_at AS organization_created_at,
          o.updated_at AS organization_updated_at
        FROM users u
        JOIN organizations o ON o.id = u.organization_id
        WHERE u.email_lookup_hash = $1
        LIMIT 1
      `,
      [createLookupHash("user-email", email)]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      user: mapUserRow(row),
      organization: mapOrganizationJoin(row)
    };
  });
}

async function markTranscriptConsentFromPostgres(
  userId: string,
  organizationId: string
): Promise<SessionUser | null> {
  return withPostgresTransaction(async (client) => {
    const timestamp = nowIso();
    const updateResult = await client.query(
      `
        UPDATE users
        SET transcript_consent_at = $3, updated_at = $3
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `,
      [userId, organizationId, timestamp]
    );

    const userRow = updateResult.rows[0];
    if (!userRow) {
      return null;
    }

    const organizationResult = await client.query(
      `SELECT * FROM organizations WHERE id = $1 LIMIT 1`,
      [organizationId]
    );
    const organizationRow = organizationResult.rows[0];
    if (!organizationRow) {
      return null;
    }

    return toSessionUser(mapUserRow(userRow), mapOrganizationRow(organizationRow));
  });
}

async function registerAccountInPostgres(
  input: RegisterAccountInput
): Promise<{ error: string; status: 409 } | { user: SessionUser }> {
  return withPostgresTransaction(async (client) => {
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email_lookup_hash = $1 LIMIT 1`,
      [createLookupHash("user-email", input.email)]
    );
    if (existingUser.rows[0]) {
      return { error: "An account already exists for this email address.", status: 409 } as const;
    }

    const timestamp = nowIso();
    const slug = slugify(input.organizationName);
    const organizationResult = await client.query(
      `SELECT * FROM organizations WHERE slug = $1 LIMIT 1`,
      [slug]
    );

    let organization = organizationResult.rows[0]
      ? mapOrganizationRow(organizationResult.rows[0])
      : null;

    if (!organization) {
      const nextOrganization: OrganizationRecord = {
        id: createId(),
        name: input.organizationName.trim(),
        slug,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await client.query(
        `
          INSERT INTO organizations (id, name, slug, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          nextOrganization.id,
          encryptString(nextOrganization.name),
          nextOrganization.slug,
          nextOrganization.createdAt,
          nextOrganization.updatedAt
        ]
      );
      organization = nextOrganization;
    }

    const userCountResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE organization_id = $1`,
      [organization.id]
    );
    const role: "ADMIN" | "SELLER" =
      Number(userCountResult.rows[0]?.count ?? 0) === 0 ? "ADMIN" : "SELLER";

    const user: UserRecord = {
      id: createId(),
      email: input.email,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      role,
      transcriptConsentAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      organizationId: organization.id,
      accessState: "unapproved",
      sessionVersion: 0
    };

    await client.query(
      `
        INSERT INTO users (
          id,
          email,
          email_lookup_hash,
          name,
          password_hash,
          role,
          transcript_consent_at,
          access_state,
          session_version,
          created_at,
          updated_at,
          organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        user.id,
        encryptString(user.email),
        createLookupHash("user-email", user.email),
        encryptString(user.name),
        encryptString(user.passwordHash),
        user.role,
        user.transcriptConsentAt,
        user.accessState ?? "unapproved",
        user.sessionVersion ?? 0,
        user.createdAt,
        user.updatedAt,
        user.organizationId
      ]
    );

    return {
      user: toSessionUser(user, organization)
    } as const;
  });
}

async function deleteAccountDataFromPostgres(
  userId: string,
  organizationId: string
): Promise<void> {
  await withPostgresTransaction(async (client) => {
    await client.query(`DELETE FROM users WHERE id = $1 AND organization_id = $2`, [
      userId,
      organizationId
    ]);

    const remainingUsers = await client.query(
      `SELECT 1 FROM users WHERE organization_id = $1 LIMIT 1`,
      [organizationId]
    );
    if (remainingUsers.rows.length === 0) {
      await client.query(`DELETE FROM organizations WHERE id = $1`, [organizationId]);
    }
  });
}

async function ensureSeedDataInPostgres(): Promise<boolean> {
  return withPostgresTransaction(async (client) => {
    const existingScenario = await client.query(`SELECT 1 FROM scenarios LIMIT 1`);
    if (existingScenario.rows[0]) {
      return false;
    }

    const timestamp = nowIso();
    const scenarioIdByKey = new Map<string, string>();

    for (const scenario of seedData.scenarios) {
      const id = createId();
      scenarioIdByKey.set(scenario.key, id);
      await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        [
          id,
          scenario.key,
          scenario.title,
          scenario.description,
          true,
          scenario.buyerCompany,
          scenario.buyerRole,
          scenario.buyerTone,
          scenario.challenge,
          scenario.goal,
          scenario.openingLine,
          timestamp,
          timestamp,
          null
        ]
      );
    }

    for (const document of seedData.documents) {
      const scenarioId = scenarioIdByKey.get(document.scenarioKey);
      if (!scenarioId) {
        continue;
      }

      await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          createId(),
          encryptString(document.title),
          document.type,
          encryptNullableString(document.content),
          encryptNullableString(document.summary),
          encryptNullableString(document.sourceUrl),
          timestamp,
          timestamp,
          null,
          scenarioId
        ]
      );
    }

    return true;
  });
}

async function listAccessibleScenarioRecordsFromPostgres(
  organizationId: string
): Promise<ScenarioRecord[]> {
  return withPostgres(async (pool) => {
    const result = await pool.query(
      `
        SELECT *
        FROM scenarios
        WHERE is_active = TRUE
          AND (organization_id IS NULL OR organization_id = $1)
        ORDER BY title ASC
      `,
      [organizationId]
    );

    return result.rows.map(mapScenarioRow);
  });
}

async function getScenarioContextFromPostgres(
  scenarioId: string,
  organizationId: string
): Promise<{
  documents: DocumentRecord[];
  scenario: ScenarioRecord;
} | null> {
  return withPostgres(async (pool) => {
    const scenarioResult = await pool.query(
      `
        SELECT *
        FROM scenarios
        WHERE id = $1
          AND is_active = TRUE
          AND (organization_id IS NULL OR organization_id = $2)
        LIMIT 1
      `,
      [scenarioId, organizationId]
    );
    const scenarioRow = scenarioResult.rows[0];
    if (!scenarioRow) {
      return null;
    }

    return {
      scenario: mapScenarioRow(scenarioRow),
      documents: await listAccessibleDocumentsFromPostgres(pool, scenarioId, organizationId)
    };
  });
}

async function listHydratedSessionSummariesFromPostgres(
  userId: string,
  organizationId: string
): Promise<HydratedSession[]> {
  return withPostgres(async (pool) => {
    const sessionResult = await pool.query(
      `
        SELECT *
        FROM sessions
        WHERE user_id = $1 AND organization_id = $2
        ORDER BY created_at DESC
      `,
      [userId, organizationId]
    );

    return Promise.all(
      sessionResult.rows.map(async (row) => {
        const session = mapSessionRow(row);
        const scenarioResult = await pool.query(`SELECT * FROM scenarios WHERE id = $1 LIMIT 1`, [
          session.scenarioId
        ]);
        const scenarioRow = scenarioResult.rows[0];
        if (!scenarioRow) {
          return null;
        }

        const messagesResult = await pool.query(
          `SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC`,
          [session.id]
        );

        return {
          ...session,
          scenario: mapScenarioRow(scenarioRow),
          messages: messagesResult.rows.map(mapMessageRow)
        };
      })
    ).then((sessions) =>
      sessions.filter((session): session is HydratedSession => session !== null)
    );
  });
}

async function getHydratedSessionContextFromPostgres(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<HydratedSessionContext | null> {
  return withPostgres(async (pool) =>
    loadHydratedSessionContext(pool, sessionId, userId, organizationId)
  );
}

async function createSessionWithOpeningInPostgres(
  user: SessionUser,
  scenarioId: string,
  openingMessage: string
): Promise<HydratedSessionContext | null> {
  return withPostgresTransaction(async (client) => {
    const scenarioContext = await getScenarioContextWithinTransaction(
      client,
      scenarioId,
      user.organizationId
    );
    if (!scenarioContext) {
      return null;
    }

    const timestamp = nowIso();
    const sessionId = createId();
    await client.query(
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
      [sessionId, timestamp, user.id, scenarioId, user.organizationId]
    );
    await client.query(
      `
        INSERT INTO messages (id, role, content, created_at, updated_at, session_id)
        VALUES ($1, 'ASSISTANT', $2, $3, $3, $4)
      `,
      [createId(), encryptString(openingMessage), timestamp, sessionId]
    );

    return loadHydratedSessionContext(client, sessionId, user.id, user.organizationId);
  });
}

async function appendSessionMessagesInPostgres(
  sessionId: string,
  userId: string,
  organizationId: string,
  messages: SessionMessageInput[],
  coachDelta: number
): Promise<HydratedSessionContext | null> {
  return withPostgresTransaction(async (client) => {
    const timestamp = nowIso();
    const updateResult = await client.query(
      `
        UPDATE sessions
        SET updated_at = $4, coach_intervention_count = coach_intervention_count + $5
        WHERE id = $1
          AND user_id = $2
          AND organization_id = $3
          AND status = 'ACTIVE'
        RETURNING id
      `,
      [sessionId, userId, organizationId, timestamp, coachDelta]
    );

    if (!updateResult.rows[0]) {
      return null;
    }

    for (const message of messages) {
      await client.query(
        `
          INSERT INTO messages (id, role, content, created_at, updated_at, session_id)
          VALUES ($1, $2, $3, $4, $4, $5)
        `,
        [createId(), message.role, encryptString(message.content), timestamp, sessionId]
      );
    }

    return loadHydratedSessionContext(client, sessionId, userId, organizationId);
  });
}

async function completeSessionRecordInPostgres(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<HydratedSessionContext | null> {
  return withPostgresTransaction(async (client) => {
    const current = await client.query(
      `
        SELECT status
        FROM sessions
        WHERE id = $1 AND user_id = $2 AND organization_id = $3
        LIMIT 1
      `,
      [sessionId, userId, organizationId]
    );
    if (!current.rows[0]) {
      return null;
    }

    if (current.rows[0].status === "ACTIVE") {
      const timestamp = nowIso();
      await client.query(
        `
          UPDATE sessions
          SET status = 'COMPLETED', ended_at = $4, updated_at = $4
          WHERE id = $1 AND user_id = $2 AND organization_id = $3
        `,
        [sessionId, userId, organizationId, timestamp]
      );
    }

    return loadHydratedSessionContext(client, sessionId, userId, organizationId);
  });
}

async function loadHydratedSessionContext(
  executor: {
    query: PgPool["query"];
  },
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<HydratedSessionContext | null> {
  const sessionResult = await executor.query(
    `
      SELECT *
      FROM sessions
      WHERE id = $1 AND user_id = $2 AND organization_id = $3
      LIMIT 1
    `,
    [sessionId, userId, organizationId]
  );
  const sessionRow = sessionResult.rows[0];
  if (!sessionRow) {
    return null;
  }

  const session = mapSessionRow(sessionRow);
  const scenarioResult = await executor.query(`SELECT * FROM scenarios WHERE id = $1 LIMIT 1`, [
    session.scenarioId
  ]);
  const scenarioRow = scenarioResult.rows[0];
  if (!scenarioRow) {
    return null;
  }

  const [messagesResult, documents] = await Promise.all([
    executor.query(`SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC`, [
      sessionId
    ]),
    listAccessibleDocumentsFromPostgres(executor, session.scenarioId, organizationId)
  ]);

  return {
    ...session,
    scenario: mapScenarioRow(scenarioRow),
    messages: messagesResult.rows.map(mapMessageRow),
    documents
  };
}

async function getScenarioContextWithinTransaction(
  client: PoolClient,
  scenarioId: string,
  organizationId: string
): Promise<{
  documents: DocumentRecord[];
  scenario: ScenarioRecord;
} | null> {
  const scenarioResult = await client.query(
    `
      SELECT *
      FROM scenarios
      WHERE id = $1
        AND is_active = TRUE
        AND (organization_id IS NULL OR organization_id = $2)
      LIMIT 1
    `,
    [scenarioId, organizationId]
  );
  const scenarioRow = scenarioResult.rows[0];
  if (!scenarioRow) {
    return null;
  }

  return {
    scenario: mapScenarioRow(scenarioRow),
    documents: await listAccessibleDocumentsFromPostgres(client, scenarioId, organizationId)
  };
}

async function listAccessibleDocumentsFromPostgres(
  executor: { query: PgPool["query"] },
  scenarioId: string,
  organizationId: string
): Promise<DocumentRecord[]> {
  const result = await executor.query(
    `
      SELECT *
      FROM documents
      WHERE scenario_id = $1
        AND (organization_id IS NULL OR organization_id = $2)
      ORDER BY created_at ASC
    `,
    [scenarioId, organizationId]
  );
  return result.rows.map(mapDocumentRow);
}

function mapOrganizationJoin(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.organization_id_value),
    name: decryptString(String(row.organization_name)),
    slug: String(row.organization_slug),
    createdAt: toIsoString(row.organization_created_at),
    updatedAt: toIsoString(row.organization_updated_at)
  };
}

function mapOrganizationRow(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: String(row.id),
    name: decryptString(String(row.name)),
    slug: String(row.slug),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapUserRow(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    email: decryptString(String(row.email)),
    name: decryptString(String(row.name)),
    passwordHash: decryptString(String(row.password_hash)),
    role: row.role as UserRecord["role"],
    transcriptConsentAt: row.transcript_consent_at ? toIsoString(row.transcript_consent_at) : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    organizationId: String(row.organization_id),
    accessState: normalizeAccountAccessState(row.access_state),
    sessionVersion: Number(row.session_version ?? 0)
  };
}

function normalizeAccountAccessState(value: unknown): AccountAccessState {
  return value === "active" || value === "suspended" ? value : "unapproved";
}

function mapScenarioRow(row: Record<string, unknown>): ScenarioRecord {
  return {
    id: String(row.id),
    key: String(row.key),
    title: String(row.title),
    description: String(row.description),
    isActive: Boolean(row.is_active),
    buyerCompany: String(row.buyer_company),
    buyerRole: String(row.buyer_role),
    buyerTone: String(row.buyer_tone),
    challenge: String(row.challenge),
    goal: String(row.goal),
    openingLine: String(row.opening_line),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    organizationId: row.organization_id ? String(row.organization_id) : null
  };
}

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    status: row.status as SessionRecord["status"],
    startedAt: toIsoString(row.started_at),
    endedAt: row.ended_at ? toIsoString(row.ended_at) : null,
    coachInterventionCount: Number(row.coach_intervention_count),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    userId: String(row.user_id),
    scenarioId: String(row.scenario_id),
    organizationId: String(row.organization_id)
  };
}

function mapMessageRow(row: Record<string, unknown>): MessageRecord {
  return {
    id: String(row.id),
    role: row.role as MessageRecord["role"],
    content: decryptString(String(row.content)),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    sessionId: String(row.session_id)
  };
}

function mapDocumentRow(row: Record<string, unknown>): DocumentRecord {
  return {
    id: String(row.id),
    title: decryptString(String(row.title)),
    type: row.type as DocumentRecord["type"],
    content: decryptNullableString((row.content as null | string) ?? null),
    summary: decryptNullableString((row.summary as null | string) ?? null),
    sourceUrl: decryptNullableString((row.source_url as null | string) ?? null),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    organizationId: row.organization_id ? String(row.organization_id) : null,
    scenarioId: row.scenario_id ? String(row.scenario_id) : null
  };
}

function toIsoString(value: unknown): string {
  return new Date(String(value)).toISOString();
}
