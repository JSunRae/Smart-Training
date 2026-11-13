import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import type {
  AuthResponse,
  DashboardResponse,
  MessageResponse,
  SessionResponse,
  SessionsResponse
} from "@core/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccount } from "./auth/account/route";
import { POST as login } from "./auth/login/route";
import { POST as logout } from "./auth/logout/route";
import { POST as register } from "./auth/register/route";
import { GET as dashboard } from "./dashboard/route";
import { GET as getSession } from "./sessions/[sessionId]/route";
import { POST as coach } from "./sessions/[sessionId]/coach/route";
import { POST as complete } from "./sessions/[sessionId]/complete/route";
import { POST as message } from "./sessions/[sessionId]/message/route";
import { GET as listSessions } from "./sessions/route";
import { POST as start } from "./sessions/start/route";
import { readDatabase, resetDatabase } from "@/lib/store";

let tempDirectory = "";
let storeFileName = "";

describe("roleplay API flow", () => {
  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), "smart-training-"));
    storeFileName = `${path.basename(tempDirectory)}.json`;
    process.env.SMART_TRAINING_DB_PATH = storeFileName;
    process.env.APP_SESSION_SECRET = "test-session-secret";
    process.env.OPENAI_API_KEY = "";
  });

  afterEach(async () => {
    delete process.env.SMART_TRAINING_DB_PATH;
    delete process.env.APP_SESSION_SECRET;
    delete process.env.OPENAI_API_KEY;
    delete process.env.SESSION_RETENTION_DAYS;
    (globalThis as typeof globalThis & { __smartTrainingRateLimits?: Map<string, unknown> })
      .__smartTrainingRateLimits?.clear();

    if (tempDirectory) {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = "";
    }

    if (storeFileName) {
      await rm(path.join(process.cwd(), "data", storeFileName), { force: true });
      storeFileName = "";
    }
  });

  it("registers, logs out, logs back in, and loads the dashboard", async () => {
    const registered = await registerUser({
      email: "alex@example.com",
      name: "Alex Mercer",
      organizationName: "Northwind Labs"
    });

    expect(registered.body.user.role).toBe("ADMIN");

    const logoutResponse = await logout(createRequest("/api/auth/logout", "POST", undefined, registered.cookie));
    expect(logoutResponse.status).toBe(200);
    expect((await dashboard(createRequest("/api/dashboard", "GET", undefined, registered.cookie))).status).toBe(401);

    const loginResponse = await login(
      createRequest("/api/auth/login", "POST", {
        email: "alex@example.com",
        password: "LaunchReady2026"
      })
    );

    expect(loginResponse.status).toBe(200);
    const loginCookie = readCookie(loginResponse);
    const dashboardResponse = await dashboard(createRequest("/api/dashboard", "GET", undefined, loginCookie));
    expect(dashboardResponse.status).toBe(200);

    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    expect(dashboardBody.user.organization.name).toBe("Northwind Labs");
    expect(dashboardBody.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(dashboardBody.sessions).toHaveLength(0);
  });

  it.each([undefined, false, "false"])("requires explicit transcript consent at registration (%j)", async (consent) => {
    const response = await register(
      createRequest("/api/auth/register", "POST", {
        email: "consent@example.com",
        name: "Consent Tester",
        organizationName: "Consent Workspace",
        password: "LaunchReady2026",
        acceptTranscriptConsent: consent
      })
    );

    expect(response.status).toBe(400);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("requires explicit transcript consent before signing in an account without it", async () => {
    const credentials = {
      email: "legacy-consent@example.com",
      password: "LaunchReady2026"
    };
    await registerUser({
      email: credentials.email,
      name: "Legacy Tester",
      organizationName: "Consent Workspace"
    });
    const database = await readDatabase();
    database.users[0]!.transcriptConsentAt = null;
    await resetDatabase(database);

    const rejected = await login(
      createRequest("/api/auth/login", "POST", { ...credentials, acceptTranscriptConsent: "false" })
    );
    expect(rejected.status).toBe(400);
    expect(rejected.headers.has("set-cookie")).toBe(false);

    const accepted = await login(
      createRequest("/api/auth/login", "POST", { ...credentials, acceptTranscriptConsent: true })
    );
    expect(accepted.status).toBe(200);
    expect((await readJson<AuthResponse>(accepted)).user.transcriptConsentAt).toBeTruthy();
  });

  it("scopes shared-scenario documents to the session organization throughout the route lifecycle", async () => {
    const firstUser = await registerUser({
      email: "scope-a@example.com",
      name: "Scope Seller A",
      organizationName: "Scope Organization A"
    });
    const secondUser = await registerUser({
      email: "scope-b@example.com",
      name: "Scope Seller B",
      organizationName: "Scope Organization B"
    });
    const firstDashboard = await readJson<DashboardResponse>(
      await dashboard(createRequest("/api/dashboard", "GET", undefined, firstUser.cookie))
    );
    const scenarioId = firstDashboard.scenarios[0]!.id;
    const globalContent = "ScopeFixture guidance shared across organizations.";
    const firstContent = "ScopeFixture private guidance for organization A.";
    const secondContent = "ScopeFixture private guidance for organization B.";
    const documents = [
      { organizationId: null, content: globalContent },
      { organizationId: firstUser.body.user.organization.id, content: firstContent },
      { organizationId: secondUser.body.user.organization.id, content: secondContent }
    ];
    const timestamp = new Date().toISOString();

    const database = await readDatabase();
    const scenario = database.scenarios.find((entry) => entry.id === scenarioId)!;
    expect(scenario.organizationId).toBeNull();
    scenario.title = "ScopeFixture";
    scenario.challenge = "ScopeFixture";
    database.documents.push(
      ...documents.map((document, index) => ({
        id: `scope-document-${index}`,
        title: "ScopeFixture ScopeFixture ScopeFixture",
        type: "NOTE" as const,
        content: document.content,
        summary: null,
        sourceUrl: null,
        organizationId: document.organizationId,
        scenarioId,
        createdAt: timestamp,
        updatedAt: timestamp
      }))
    );
    await resetDatabase(database);

    for (const { account, ownContent, foreignContent } of [
      { account: firstUser, ownContent: firstContent, foreignContent: secondContent },
      { account: secondUser, ownContent: secondContent, foreignContent: firstContent }
    ]) {
      const assertScopedResponse = async (response: Response, status = 200) => {
        expect(response.status).toBe(status);
        const body = await readJson<SessionResponse>(response);
        expect(body.session.contextSnippets).toEqual(
          expect.arrayContaining([globalContent, ownContent])
        );
        expect(JSON.stringify(body)).not.toContain(foreignContent);
        return body.session;
      };
      const started = await assertScopedResponse(
        await start(createRequest("/api/sessions/start", "POST", { scenarioId }, account.cookie)),
        201
      );
      const pathname = `/api/sessions/${started.id}`;
      await assertScopedResponse(
        await getSession(
          createRequest(pathname, "GET", undefined, account.cookie),
          sessionContext(started.id)
        )
      );
      await assertScopedResponse(
        await message(
          createRequest(
            `${pathname}/message`,
            "POST",
            { content: "ScopeFixture practice" },
            account.cookie
          ),
          sessionContext(started.id)
        )
      );
      await assertScopedResponse(
        await coach(
          createRequest(`${pathname}/coach`, "POST", undefined, account.cookie),
          sessionContext(started.id)
        )
      );
      const completed = await assertScopedResponse(
        await complete(
          createRequest(`${pathname}/complete`, "POST", undefined, account.cookie),
          sessionContext(started.id)
        )
      );
      expect(completed.status).toBe("COMPLETED");
      await assertScopedResponse(
        await getSession(
          createRequest(pathname, "GET", undefined, account.cookie),
          sessionContext(started.id)
        )
      );
    }
  });

  it("supports the full session lifecycle", async () => {
    const registered = await registerUser({
      email: "seller@example.com",
      name: "Jamie Chen",
      organizationName: "Revenue Forge"
    });

    const dashboardResponse = await dashboard(createRequest("/api/dashboard", "GET", undefined, registered.cookie));
    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    const scenarioId = dashboardBody.scenarios[0]?.id;

    expect(scenarioId).toBeTruthy();

    const startResponse = await start(
      createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie)
    );
    expect(startResponse.status).toBe(201);

    const started = await readJson<SessionResponse>(startResponse);
    expect(started.session.messages).toHaveLength(1);
    expect(started.session.messages[0]?.role).toBe("ASSISTANT");

    const messageResponse = await message(
      createRequest(
        `/api/sessions/${started.session.id}/message`,
        "POST",
        { content: "We reduce time-to-value by replacing manual workflows in the first 30 days." },
        registered.cookie
      ),
      sessionContext(started.session.id)
    );
    expect(messageResponse.status).toBe(200);

    const buyerTurn = await readJson<MessageResponse>(messageResponse);
    expect(buyerTurn.reply.role).toBe("ASSISTANT");
    expect(buyerTurn.session.messageCount).toBe(3);

    const coachResponse = await coach(
      createRequest(`/api/sessions/${started.session.id}/coach`, "POST", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(coachResponse.status).toBe(200);

    const coached = await readJson<MessageResponse>(coachResponse);
    expect(coached.reply.role).toBe("COACH");
    expect(coached.session.coachInterventionCount).toBe(1);

    const completeResponse = await complete(
      createRequest(`/api/sessions/${started.session.id}/complete`, "POST", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(completeResponse.status).toBe(200);

    const completed = await readJson<SessionResponse>(completeResponse);
    expect(completed.session.status).toBe("COMPLETED");
    expect(completed.session.endedAt).toBeTruthy();

    const sessionsResponse = await listSessions(createRequest("/api/sessions", "GET", undefined, registered.cookie));
    expect(sessionsResponse.status).toBe(200);

    const sessions = await readJson<SessionsResponse>(sessionsResponse);
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]?.status).toBe("COMPLETED");

    const detailResponse = await getSession(
      createRequest(`/api/sessions/${started.session.id}`, "GET", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(detailResponse.status).toBe(200);

    const detail = await readJson<SessionResponse>(detailResponse);
    expect(detail.session.messages.map((entry) => entry.role)).toEqual([
      "ASSISTANT",
      "USER",
      "ASSISTANT",
      "COACH"
    ]);
  });

  it("rejects message and coach turns after a session is completed", async () => {
    const registered = await registerUser({
      email: "closed-session@example.com",
      name: "Robin Vale",
      organizationName: "State Guard Org"
    });

    const dashboardResponse = await dashboard(createRequest("/api/dashboard", "GET", undefined, registered.cookie));
    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    const scenarioId = dashboardBody.scenarios[0]?.id;

    expect(scenarioId).toBeTruthy();

    const started = await readJson<SessionResponse>(
      await start(createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie))
    );

    const completeResponse = await complete(
      createRequest(`/api/sessions/${started.session.id}/complete`, "POST", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(completeResponse.status).toBe(200);

    const completed = await readJson<SessionResponse>(completeResponse);
    expect(completed.session.status).toBe("COMPLETED");
    expect(completed.session.messageCount).toBe(1);
    expect(completed.session.coachInterventionCount).toBe(0);
    expect(completed.session.endedAt).toBeTruthy();

    const messageResponse = await message(
      createRequest(
        `/api/sessions/${started.session.id}/message`,
        "POST",
        { content: "Following up after completion." },
        registered.cookie
      ),
      sessionContext(started.session.id)
    );
    expect(messageResponse.status).toBe(409);
    await expect(messageResponse.json()).resolves.toEqual({ error: "Session is no longer active." });

    const coachResponse = await coach(
      createRequest(`/api/sessions/${started.session.id}/coach`, "POST", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(coachResponse.status).toBe(409);
    await expect(coachResponse.json()).resolves.toEqual({ error: "Session is no longer active." });

    const detailResponse = await getSession(
      createRequest(`/api/sessions/${started.session.id}`, "GET", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(detailResponse.status).toBe(200);

    const detail = await readJson<SessionResponse>(detailResponse);
    expect(detail.session.status).toBe("COMPLETED");
    expect(detail.session.endedAt).toBe(completed.session.endedAt);
    expect(detail.session.messageCount).toBe(completed.session.messageCount);
    expect(detail.session.coachInterventionCount).toBe(completed.session.coachInterventionCount);
    expect(detail.session.messages.map((entry) => entry.role)).toEqual(["ASSISTANT"]);
  });

  it("blocks session access across organizations", async () => {
    const firstUser = await registerUser({
      email: "owner@example.com",
      name: "Taylor Ames",
      organizationName: "Acme Field Team"
    });
    const secondUser = await registerUser({
      email: "outsider@example.com",
      name: "Morgan Hale",
      organizationName: "Other Org"
    });

    const firstDashboard = await readJson<DashboardResponse>(
      await dashboard(createRequest("/api/dashboard", "GET", undefined, firstUser.cookie))
    );
    const scenarioId = firstDashboard.scenarios[0]?.id;
    expect(scenarioId).toBeTruthy();

    const started = await readJson<SessionResponse>(
      await start(
        createRequest("/api/sessions/start", "POST", { scenarioId }, firstUser.cookie)
      )
    );

    const unauthorized = await getSession(
      createRequest(`/api/sessions/${started.session.id}`, "GET", undefined, secondUser.cookie),
      sessionContext(started.session.id)
    );

    expect(unauthorized.status).toBe(404);
    await expect(unauthorized.json()).resolves.toEqual({ error: "Session not found." });
  });

  it("prunes expired sessions and transcript history on session reads", async () => {
    process.env.SESSION_RETENTION_DAYS = "30";
    const now = Date.now();
    const expiredStartedAt = new Date(now - 61 * 24 * 60 * 60 * 1000).toISOString();
    const expiredEndedAt = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const retainedStartedAt = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const retainedEndedAt = new Date(now - 10 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();

    const registered = await registerUser({
      email: "retention@example.com",
      name: "Casey Holt",
      organizationName: "Retention Test Org"
    });

    const dashboardResponse = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, registered.cookie)
    );
    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    const scenarioId = dashboardBody.scenarios[0]?.id;

    expect(scenarioId).toBeTruthy();

    const database = await readDatabase();
    database.sessions.push(
      {
        id: "expired-session",
        status: "COMPLETED",
        startedAt: expiredStartedAt,
        endedAt: expiredEndedAt,
        coachInterventionCount: 0,
        createdAt: expiredStartedAt,
        updatedAt: expiredEndedAt,
        userId: registered.body.user.id,
        scenarioId: scenarioId!,
        organizationId: registered.body.user.organization.id
      },
      {
        id: "retained-session",
        status: "COMPLETED",
        startedAt: retainedStartedAt,
        endedAt: retainedEndedAt,
        coachInterventionCount: 1,
        createdAt: retainedStartedAt,
        updatedAt: retainedEndedAt,
        userId: registered.body.user.id,
        scenarioId: scenarioId!,
        organizationId: registered.body.user.organization.id
      }
    );
    database.messages.push(
      {
        id: "expired-message",
        role: "ASSISTANT",
        content: "Expired transcript history",
        createdAt: expiredEndedAt,
        updatedAt: expiredEndedAt,
        sessionId: "expired-session"
      },
      {
        id: "retained-message",
        role: "ASSISTANT",
        content: "Retained transcript history",
        createdAt: retainedEndedAt,
        updatedAt: retainedEndedAt,
        sessionId: "retained-session"
      }
    );
    await resetDatabase(database);

    const sessionsResponse = await listSessions(
      createRequest("/api/sessions", "GET", undefined, registered.cookie)
    );
    expect(sessionsResponse.status).toBe(200);

    const sessions = await readJson<SessionsResponse>(sessionsResponse);
    expect(sessions.sessions.map((session) => session.id)).toEqual(["retained-session"]);

    const retainedDatabase = await readDatabase();
    expect(retainedDatabase.sessions.some((session) => session.id === "expired-session")).toBe(false);
    expect(
      retainedDatabase.messages.some((message) => message.sessionId === "expired-session")
    ).toBe(false);
    expect(retainedDatabase.sessions.some((session) => session.id === "retained-session")).toBe(true);
    expect(
      retainedDatabase.messages.some((message) => message.sessionId === "retained-session")
    ).toBe(true);
  });

  it("deletes an account and removes its transcript history", async () => {
    const registered = await registerUser({
      email: "cleanup@example.com",
      name: "Sam Rivera",
      organizationName: "Delete Test Org"
    });

    const firstDashboard = await readJson<DashboardResponse>(
      await dashboard(createRequest("/api/dashboard", "GET", undefined, registered.cookie))
    );
    const scenarioId = firstDashboard.scenarios[0]?.id;
    expect(scenarioId).toBeTruthy();

    const started = await readJson<SessionResponse>(
      await start(
        createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie)
      )
    );

    const databaseBeforeDelete = await readDatabase();
    databaseBeforeDelete.scenarios.push({
      id: "org-scenario-1",
      key: "org-scenario-1",
      title: "Org Scenario",
      description: "Org-only practice prompt",
      isActive: true,
      buyerCompany: "Delete Test Buyer",
      buyerRole: "Director",
      buyerTone: "Direct",
      challenge: "Validate cleanup",
      goal: "Confirm org-owned content is deleted",
      openingLine: "Walk me through your rollout plan.",
      createdAt: "2026-05-29T00:00:00.000Z",
      updatedAt: "2026-05-29T00:00:00.000Z",
      organizationId: registered.body.user.organization.id
    });
    databaseBeforeDelete.documents.push(
      {
        id: "org-document-1",
        title: "Org Document",
        type: "NOTE",
        content: "Owned by the deleted organization.",
        summary: null,
        sourceUrl: null,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        organizationId: registered.body.user.organization.id,
        scenarioId: "org-scenario-1"
      },
      {
        id: "shared-document-1",
        title: "Shared Document",
        type: "NOTE",
        content: "Should keep the document but clear the deleted scenario reference.",
        summary: null,
        sourceUrl: null,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
        organizationId: null,
        scenarioId: "org-scenario-1"
      }
    );
    await resetDatabase(databaseBeforeDelete);

    const deletionResponse = await deleteAccount(
      createRequest("/api/auth/account", "DELETE", undefined, registered.cookie)
    );
    expect(deletionResponse.status).toBe(200);
    expect(deletionResponse.headers.get("set-cookie")).toContain("smart_training_session=");
    expect(deletionResponse.headers.get("set-cookie")).toContain("Max-Age=0");

    const dashboardAfterDelete = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, registered.cookie)
    );
    expect(dashboardAfterDelete.status).toBe(401);

    const database = await readDatabase();
    expect(database.users.some((user) => user.email === "cleanup@example.com")).toBe(false);
    expect(
      database.organizations.some((organization) => organization.id === registered.body.user.organization.id)
    ).toBe(false);
    expect(database.sessions.some((session) => session.id === started.session.id)).toBe(false);
    expect(database.messages.some((message) => message.sessionId === started.session.id)).toBe(
      false
    );
    expect(database.scenarios.some((scenario) => scenario.id === "org-scenario-1")).toBe(false);
    expect(database.documents.some((document) => document.id === "org-document-1")).toBe(false);
    expect(database.documents.find((document) => document.id === "shared-document-1")?.scenarioId).toBe(
      null
    );
  });
});

async function registerUser({
  email,
  name,
  organizationName
}: {
  email: string;
  name: string;
  organizationName: string;
}) {
  const response = await register(
    createRequest("/api/auth/register", "POST", {
      email,
      name,
      organizationName,
      password: "LaunchReady2026",
      acceptTranscriptConsent: true
    })
  );

  expect(response.status).toBe(201);

  return {
    cookie: readCookie(response),
    body: await readJson<AuthResponse>(response)
  };
}

function createRequest(
  pathname: string,
  method = "GET",
  body?: unknown,
  cookie?: string
): Request {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new Request(`http://localhost${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function sessionContext(sessionId: string) {
  return {
    params: Promise.resolve({ sessionId })
  };
}

function readCookie(response: Response): string {
  const cookieHeader = response.headers.get("set-cookie");
  expect(cookieHeader).toBeTruthy();
  return cookieHeader!.split(";")[0];
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
