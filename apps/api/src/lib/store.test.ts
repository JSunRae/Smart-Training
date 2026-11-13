import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readDatabase, resetDatabase, type Database } from "./store";

let tempDirectory = "";
let storeFileName = "";

describe("store hardening", () => {
  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), "smart-training-store-"));
    storeFileName = `${path.basename(tempDirectory)}.json`;
    process.env.SMART_TRAINING_DB_PATH = storeFileName;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.SESSION_RETENTION_DAYS;
  });

  afterEach(async () => {
    delete process.env.SMART_TRAINING_DB_PATH;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.SESSION_RETENTION_DAYS;

    if (tempDirectory) {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = "";
    }

    if (storeFileName) {
      await rm(path.join(process.cwd(), "data", storeFileName), { force: true });
      storeFileName = "";
    }
  });

  it("encrypts sensitive fields at rest when a key is configured", async () => {
    process.env.DATA_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    await resetDatabase(sampleDatabase());
    const raw = await readFile(path.join(process.cwd(), "data", storeFileName), "utf8");

    expect(raw).not.toContain("owner@example.com");
    expect(raw).not.toContain("This is the transcript body.");

    const database = await readDatabase();
    expect(database.users[0]?.email).toBe("owner@example.com");
    expect(database.messages[0]?.content).toBe("This is the transcript body.");
  });

  it("purges expired completed sessions based on retention policy", async () => {
    process.env.SESSION_RETENTION_DAYS = "30";

    const database = sampleDatabase();
    database.sessions.push({
      id: "expired-session",
      status: "COMPLETED",
      startedAt: "2025-01-01T00:00:00.000Z",
      endedAt: "2025-01-02T00:00:00.000Z",
      coachInterventionCount: 0,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
      userId: "user-1",
      scenarioId: "scenario-1",
      organizationId: "org-1"
    });
    database.messages.push({
      id: "expired-message",
      role: "ASSISTANT",
      content: "Expired transcript",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      sessionId: "expired-session"
    });

    await resetDatabase(database);
    const retained = await readDatabase();

    expect(retained.sessions.some((session) => session.id === "expired-session")).toBe(false);
    expect(retained.messages.some((message) => message.sessionId === "expired-session")).toBe(
      false
    );
    expect(retained.sessions.some((session) => session.id === "session-1")).toBe(true);
  });

  it("recovers an empty store file as an empty database", async () => {
    await resetDatabase();
    await writeFile(path.join(process.cwd(), "data", storeFileName), "", "utf8");

    await expect(readDatabase()).resolves.toEqual({
      organizations: [],
      users: [],
      scenarios: [],
      sessions: [],
      messages: [],
      documents: [],
      pilotInvitations: [],
      pilotPasswordResets: []
    });

    const raw = await readFile(path.join(process.cwd(), "data", storeFileName), "utf8");
    expect(raw.trim()).toBeTruthy();
  });
});

function sampleDatabase(): Database {
  return {
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
      }
    ],
    scenarios: [
      {
        id: "scenario-1",
        key: "scenario",
        title: "Scenario",
        description: "Description",
        isActive: true,
        buyerCompany: "Buyer Co",
        buyerRole: "Buyer",
        buyerTone: "Curious",
        challenge: "Challenge",
        goal: "Goal",
        openingLine: "Opening line",
        organizationId: null,
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
        scenarioId: "scenario-1",
        organizationId: "org-1"
      }
    ],
    messages: [
      {
        id: "message-1",
        role: "ASSISTANT",
        content: "This is the transcript body.",
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z",
        sessionId: "session-1"
      }
    ],
    documents: [
      {
        id: "document-1",
        title: "Enablement Notes",
        type: "NOTE",
        content: "Internal note",
        summary: "Summary",
        sourceUrl: null,
        organizationId: null,
        scenarioId: "scenario-1",
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z"
      }
    ]
  };
}
