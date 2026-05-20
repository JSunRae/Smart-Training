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
import { resetPostgresRuntime } from "@/lib/postgres";
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
    await resetPostgresRuntime();
  });

  it("registers, logs out, logs back in, and loads the dashboard", async () => {
    const registered = await registerUser({
      email: "alex@example.com",
      name: "Alex Mercer",
      organizationName: "Northwind Labs"
    });

    expect(registered.body.user.role).toBe("ADMIN");

    const logoutResponse = await logout();
    expect(logoutResponse.status).toBe(200);

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
