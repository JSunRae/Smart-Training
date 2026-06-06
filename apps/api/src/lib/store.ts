import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MessageRole, SessionStatus, UserRole } from "@core/contracts";

import {
  decryptNullableString,
  decryptString,
  encryptNullableString,
  encryptString
} from "./data-protection";
import { resolveFileStorePath } from "./database-config";
import { getSessionRetentionDays } from "./env";

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  transcriptConsentAt: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
};

export type ScenarioRecord = {
  id: string;
  key: string;
  title: string;
  description: string;
  isActive: boolean;
  buyerCompany: string;
  buyerRole: string;
  buyerTone: string;
  challenge: string;
  goal: string;
  openingLine: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string | null;
};

export type SessionRecord = {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  coachInterventionCount: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  scenarioId: string;
  organizationId: string;
};

export type MessageRecord = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  updatedAt: string;
  sessionId: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: "FILE" | "URL" | "NOTE";
  content: string | null;
  summary: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  organizationId: string | null;
  scenarioId: string | null;
};

export type Database = {
  organizations: OrganizationRecord[];
  users: UserRecord[];
  scenarios: ScenarioRecord[];
  sessions: SessionRecord[];
  messages: MessageRecord[];
  documents: DocumentRecord[];
};

const EMPTY_DATABASE: Database = {
  organizations: [],
  users: [],
  scenarios: [],
  sessions: [],
  messages: [],
  documents: []
};

let writeQueue = Promise.resolve();

export async function readDatabase(): Promise<Database> {
  const filePath = resolveFileStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    const raw = await readFile(filePath, "utf8");
    if (!raw.trim()) {
      await writeDatabaseFile(filePath, EMPTY_DATABASE);
      return structuredClone(EMPTY_DATABASE);
    }

    const database = applyRetentionPolicy(deserializeDatabase(raw));
    if (database.changed) {
      await writeDatabaseFile(filePath, database.database);
    }

    return database.database;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    await writeDatabaseFile(filePath, EMPTY_DATABASE);
    return structuredClone(EMPTY_DATABASE);
  }
}

export async function updateDatabase<T>(
  mutator: (database: Database) => Promise<T> | T
): Promise<T> {
  const run = writeQueue.then(async () => {
    const database = await readDatabase();
    const result = await mutator(database);
    const retained = applyRetentionPolicy(database);
    await writeDatabaseFile(resolveFileStorePath(), retained.database);
    return result;
  });

  writeQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

export async function resetDatabase(nextDatabase?: Database): Promise<void> {
  const database = nextDatabase ?? structuredClone(EMPTY_DATABASE);
  await mkdir(path.dirname(resolveFileStorePath()), { recursive: true });
  await writeDatabaseFile(resolveFileStorePath(), database);
}

export function createId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

function serializeDatabase(database: Database): string {
  const persisted: Database = {
    organizations: database.organizations.map((organization) => ({
      ...organization,
      name: encryptString(organization.name)
    })),
    users: database.users.map((user) => ({
      ...user,
      email: encryptString(user.email),
      name: encryptString(user.name),
      passwordHash: encryptString(user.passwordHash)
    })),
    scenarios: database.scenarios,
    sessions: database.sessions,
    messages: database.messages.map((message) => ({
      ...message,
      content: encryptString(message.content)
    })),
    documents: database.documents.map((document) => ({
      ...document,
      title: encryptString(document.title),
      content: encryptNullableString(document.content),
      summary: encryptNullableString(document.summary),
      sourceUrl: encryptNullableString(document.sourceUrl)
    }))
  };

  return JSON.stringify(persisted, null, 2);
}

async function writeDatabaseFile(filePath: string, database: Database): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, serializeDatabase(database), "utf8");
  await rename(tempPath, filePath);
}

function deserializeDatabase(raw: string): Database {
  const persisted = JSON.parse(raw) as Database;

  return {
    organizations: persisted.organizations.map((organization) => ({
      ...organization,
      name: decryptString(organization.name)
    })),
    users: persisted.users.map((user) => ({
      ...user,
      email: decryptString(user.email),
      name: decryptString(user.name),
      passwordHash: decryptString(user.passwordHash)
    })),
    scenarios: persisted.scenarios,
    sessions: persisted.sessions,
    messages: persisted.messages.map((message) => ({
      ...message,
      content: decryptString(message.content)
    })),
    documents: persisted.documents.map((document) => ({
      ...document,
      title: decryptString(document.title),
      content: decryptNullableString(document.content),
      summary: decryptNullableString(document.summary),
      sourceUrl: decryptNullableString(document.sourceUrl)
    }))
  };
}

function applyRetentionPolicy(database: Database): { changed: boolean; database: Database } {
  const retentionDays = getSessionRetentionDays();
  if (!retentionDays) {
    return { changed: false, database };
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const expiredSessionIds = new Set(
    database.sessions
      .filter((session) => {
        if (session.status === "ACTIVE") {
          return false;
        }

        const anchor = session.endedAt ?? session.updatedAt;
        return new Date(anchor).getTime() < cutoff;
      })
      .map((session) => session.id)
  );

  if (expiredSessionIds.size === 0) {
    return { changed: false, database };
  }

  database.sessions = database.sessions.filter((session) => !expiredSessionIds.has(session.id));
  database.messages = database.messages.filter(
    (message) => !expiredSessionIds.has(message.sessionId)
  );

  return {
    changed: true,
    database
  };
}
