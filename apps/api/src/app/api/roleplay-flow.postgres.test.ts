import { randomUUID } from "node:crypto";

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
import { encryptString } from "@/lib/data-protection";
import { resetPostgresRuntime, withPostgres } from "@/lib/postgres";
import { getAccountByEmail } from "@/lib/repository";

describe("roleplay API flow (postgres backend)", () => {
  beforeEach(async () => {
    process.env.DATABASE_URL = `pg-mem://${randomUUID()}`;
    process.env.APP_SESSION_SECRET = "test-session-secret";
    process.env.DATA_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.OPENAI_API_KEY = "";
    delete process.env.SMART_TRAINING_DB_PATH;
  });

  afterEach(async () => {
    delete process.env.DATABASE_URL;
    delete process.env.APP_SESSION_SECRET;
    delete process.env.DATA_ENCRYPTION_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.SMART_TRAINING_DB_PATH;
    delete process.env.SESSION_RETENTION_DAYS;
    await resetPostgresRuntime();
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
        password: "LaunchReady2026",
        acceptTranscriptConsent: true
      })
    );

    expect(loginResponse.status).toBe(200);
    const loginCookie = readCookie(loginResponse);
    const dashboardResponse = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, loginCookie)
    );
    expect(dashboardResponse.status).toBe(200);

    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    expect(dashboardBody.user.organization.name).toBe("Northwind Labs");
    expect(dashboardBody.scenarios.length).toBeGreaterThanOrEqual(3);
    expect(dashboardBody.sessions).toHaveLength(0);

    const storedAccount = await getAccountByEmail("alex@example.com");
    expect(storedAccount?.user.email).toBe("alex@example.com");
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

    await withPostgres(async (pool) => {
      const scenario = await pool.query(`SELECT organization_id FROM scenarios WHERE id = $1`, [
        scenarioId
      ]);
      expect(scenario.rows[0].organization_id).toBeNull();
      await pool.query(`UPDATE scenarios SET title = $2, challenge = $2 WHERE id = $1`, [
        scenarioId,
        "ScopeFixture"
      ]);
      for (const [index, document] of documents.entries()) {
        await pool.query(
          `
            INSERT INTO documents (
              id, title, type, content, summary, source_url,
              organization_id, scenario_id, created_at, updated_at
            )
            VALUES ($1, $2, 'NOTE', $3, NULL, NULL, $4, $5, $6, $6)
          `,
          [
            `scope-document-${index}`,
            encryptString("ScopeFixture ScopeFixture ScopeFixture"),
            encryptString(document.content),
            document.organizationId,
            scenarioId,
            timestamp
          ]
        );
      }
    });

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

    const dashboardResponse = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, registered.cookie)
    );
    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    const scenarioId = dashboardBody.scenarios[0]?.id;

    expect(scenarioId).toBeTruthy();

    const startResponse = await start(
      createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie)
    );
    expect(startResponse.status).toBe(201);

    const started = await readJson<SessionResponse>(startResponse);
    expect(started.session.messages).toHaveLength(1);

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

    const sessionsResponse = await listSessions(
      createRequest("/api/sessions", "GET", undefined, registered.cookie)
    );
    expect(sessionsResponse.status).toBe(200);

    const sessions = await readJson<SessionsResponse>(sessionsResponse);
    expect(sessions.sessions).toHaveLength(1);
  });

  it("rejects message and coach turns after a session is completed", async () => {
    const registered = await registerUser({
      email: "closed-session@example.com",
      name: "Robin Vale",
      organizationName: "State Guard Org"
    });

    const dashboardResponse = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, registered.cookie)
    );
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

  it("prunes expired sessions and transcript history when a transaction-backed request runs", async () => {
    process.env.SESSION_RETENTION_DAYS = "30";
    const now = Date.now();
    const expiredStartedAt = new Date(now - 61 * 24 * 60 * 60 * 1000).toISOString();
    const expiredEndedAt = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

    const registered = await registerUser({
      email: "pg-retention@example.com",
      name: "Jordan Pike",
      organizationName: "Retention Test Org"
    });

    const dashboardResponse = await dashboard(
      createRequest("/api/dashboard", "GET", undefined, registered.cookie)
    );
    const dashboardBody = await readJson<DashboardResponse>(dashboardResponse);
    const scenarioId = dashboardBody.scenarios[0]?.id;

    expect(scenarioId).toBeTruthy();

    const started = await readJson<SessionResponse>(
      await start(createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie))
    );

    const messageResponse = await message(
      createRequest(
        `/api/sessions/${started.session.id}/message`,
        "POST",
        { content: "Aging this session beyond retention." },
        registered.cookie
      ),
      sessionContext(started.session.id)
    );
    expect(messageResponse.status).toBe(200);

    const completeResponse = await complete(
      createRequest(`/api/sessions/${started.session.id}/complete`, "POST", undefined, registered.cookie),
      sessionContext(started.session.id)
    );
    expect(completeResponse.status).toBe(200);

    const messageCountBeforePrune = await withPostgres(async (pool) => {
      await pool.query(
        `
          UPDATE sessions
          SET started_at = $2, created_at = $2, ended_at = $3, updated_at = $3
          WHERE id = $1
        `,
        [started.session.id, expiredStartedAt, expiredEndedAt]
      );

      const result = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM messages WHERE session_id = $1`,
        [started.session.id]
      );

      return Number(result.rows[0]?.count ?? 0);
    });
    expect(messageCountBeforePrune).toBeGreaterThan(0);

    const nextStartResponse = await start(
      createRequest("/api/sessions/start", "POST", { scenarioId }, registered.cookie)
    );
    expect(nextStartResponse.status).toBe(201);

    const nextSession = await readJson<SessionResponse>(nextStartResponse);
    const sessionsResponse = await listSessions(
      createRequest("/api/sessions", "GET", undefined, registered.cookie)
    );
    expect(sessionsResponse.status).toBe(200);

    const sessions = await readJson<SessionsResponse>(sessionsResponse);
    expect(sessions.sessions.map((session) => session.id)).toEqual([nextSession.session.id]);

    const retainedState = await withPostgres(async (pool) => {
      const expiredSessionResult = await pool.query(
        `SELECT id FROM sessions WHERE id = $1 LIMIT 1`,
        [started.session.id]
      );
      const expiredMessageResult = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM messages WHERE session_id = $1`,
        [started.session.id]
      );

      return {
        expiredSessionExists: Boolean(expiredSessionResult.rows[0]),
        expiredMessageCount: Number(expiredMessageResult.rows[0]?.count ?? 0)
      };
    });

    expect(retainedState.expiredSessionExists).toBe(false);
    expect(retainedState.expiredMessageCount).toBe(0);
  });

  it("blocks session access across organizations and deletes account data", async () => {
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
      await start(createRequest("/api/sessions/start", "POST", { scenarioId }, firstUser.cookie))
    );

    const unauthorized = await getSession(
      createRequest(`/api/sessions/${started.session.id}`, "GET", undefined, secondUser.cookie),
      sessionContext(started.session.id)
    );
    expect(unauthorized.status).toBe(404);

    const deletionResponse = await deleteAccount(
      createRequest("/api/auth/account", "DELETE", undefined, firstUser.cookie)
    );
    expect(deletionResponse.status).toBe(200);

    const accountAfterDelete = await getAccountByEmail("owner@example.com");
    expect(accountAfterDelete).toBeNull();
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
