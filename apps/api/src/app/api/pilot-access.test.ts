import { createHmac, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPilotCredential } from "@/lib/pilot-access";
import {
  createPilotOrganization,
  issuePilotInvitation,
  issuePilotPasswordReset,
  revokePilotInvitation,
  setPilotAccountAccess
} from "@/lib/pilot-access-repository";
import { resetPostgresRuntime } from "@/lib/postgres";

import { POST as login } from "./auth/login/route";
import { POST as logout } from "./auth/logout/route";
import { POST as register } from "./auth/register/route";
import { POST as resetPassword } from "./auth/reset-password/route";
import { GET as getSession } from "./auth/session/route";

const email = "pilot@example.com";
const password = "PilotFirstPass123";
const newPassword = "PilotSecondPass456";
const sessionSecret = "synthetic-pilot-tests-only";
const enrolment = { name: "Pilot Seller", email, password, acceptTranscriptConsent: true };

describe.each(["file", "postgres"])("controlled pilot access (%s)", (backend) => {
  let storeName: string;

  beforeEach(() => {
    storeName = `pilot-access-test-${randomUUID()}.json`;
    vi.stubEnv("PILOT_ACCESS_MODE", "invite");
    vi.stubEnv("DATABASE_URL", backend === "postgres" ? `pg-mem://${randomUUID()}` : "");
    vi.stubEnv("SMART_TRAINING_DB_PATH", storeName);
    vi.stubEnv("APP_SESSION_SECRET", sessionSecret);
    vi.stubEnv("DATA_ENCRYPTION_KEY", "23".repeat(32));
  });

  afterEach(async () => {
    try {
      await resetPostgresRuntime();
      await rm(path.join(process.cwd(), "data", storeName), { force: true });
      (globalThis as typeof globalThis & { __smartTrainingRateLimits?: Map<string, unknown> })
        .__smartTrainingRateLimits?.clear();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("closes production registration when unset, invalid or configured for workspace", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const mode of ["", "workspce", "workspace"]) {
      vi.stubEnv("PILOT_ACCESS_MODE", mode);
      const result = await register(request({ ...enrolment, organizationName: "Existing Team" }));
      expect(result.status).toBe(403);
      expect(result.headers.has("set-cookie")).toBe(false);
    }
    expect((await login(request({ email, password }))).status).toBe(403);
  });

  it("binds single-use enrolment to the intended email, organisation and role", async () => {
    const orgId = await createOrganization();
    const { token } = await issueInvite(orgId);
    for (const body of [
      enrolment,
      { ...enrolment, email: "other@example.com", invitationToken: token },
      { ...enrolment, invitationToken: token, organizationId: "other-org", role: "ADMIN" }
    ]) {
      const result = await register(request(body));
      expect(result.status).toBe(403);
      expect(result.headers.has("set-cookie")).toBe(false);
    }
    const valid = await register(request({ ...enrolment, email: email.toUpperCase(), invitationToken: token }));
    expect(valid.status).toBe(201);
    expect((await valid.json()).user).toMatchObject({ email, role: "SELLER", organization: { id: orgId } });
    expect((await register(request({ ...enrolment, invitationToken: token }))).status).toBe(403);
    expect((await getSession(request(undefined, sessionCookie(valid)))).status).toBe(200);
  });

  it("expires, replaces and revokes invitations within their operator scope", async () => {
    const orgId = await createOrganization();
    const otherOrg = await createOrganization("Other Pilot Team");
    const expired = await issueInvite(orgId, new Date(Date.now() - 1000));
    expect((await register(request({ ...enrolment, invitationToken: expired.token }))).status).toBe(403);
    const first = await issueInvite(orgId);
    const replacement = await issueInvite(orgId);
    expect((await register(request({ ...enrolment, invitationToken: first.token }))).status).toBe(403);
    expect(await revokePilotInvitation(email, otherOrg)).toBe(false);
    expect(await revokePilotInvitation(email, orgId)).toBe(true);
    expect((await register(request({ ...enrolment, invitationToken: replacement.token }))).status).toBe(403);
  });

  it("allows one successful redemption when an invitation is submitted concurrently", async () => {
    const orgId = await createOrganization();
    const invitation = await issueInvite(orgId);
    const body = { ...enrolment, invitationToken: invitation.token };
    const results = await Promise.all([register(request(body)), register(request(body))]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 403]);
  });

  it("requires explicit approval for legacy accounts and invalidates suspended access", async () => {
    vi.stubEnv("PILOT_ACCESS_MODE", "workspace");
    const legacy = await register(request({ ...enrolment, organizationName: "Local Workspace" }));
    expect(legacy.status).toBe(201);
    const orgId = (await legacy.json()).user.organization.id as string;
    const originalCookie = sessionCookie(legacy);
    vi.stubEnv("PILOT_ACCESS_MODE", "invite");
    expect((await getSession(request(undefined, originalCookie))).status).toBe(401);
    expect((await login(request({ email, password }))).status).toBe(401);

    expect(await setPilotAccountAccess({ email, organizationId: orgId, accessState: "active" })).toBe(true);
    const authorized = await login(request({ email, password }));
    expect(authorized.status).toBe(200);
    const authorizedCookie = sessionCookie(authorized);
    const recovery = createPilotCredential();
    expect(await issuePilotPasswordReset({
      tokenHash: recovery.tokenHash, email, organizationId: orgId, expiresAt: soon()
    })).toBe(true);
    expect(await setPilotAccountAccess({ email, organizationId: orgId, accessState: "suspended" })).toBe(true);
    expect((await getSession(request(undefined, authorizedCookie))).status).toBe(401);
    expect((await login(request({ email, password }))).status).toBe(401);
    expect((await resetPassword(request({ resetToken: recovery.token, password: newPassword }))).status).toBe(403);
    expect(await setPilotAccountAccess({ email, organizationId: orgId, accessState: "active" })).toBe(true);
    expect((await getSession(request(undefined, authorizedCookie))).status).toBe(401);
    expect((await login(request({ email, password }))).status).toBe(200);
  });

  it("redeems a support reset once, revokes old sessions and requires sign-in with the new password", async () => {
    const orgId = await createOrganization();
    const invitation = await issueInvite(orgId);
    const invalidPurpose = await resetPassword(request({ resetToken: invitation.token, password: newPassword }));
    expect(invalidPurpose.status).toBe(403);
    const account = await register(request({ ...enrolment, invitationToken: invitation.token }));
    expect(account.status).toBe(201);
    const oldCookie = sessionCookie(account);
    const recovery = createPilotCredential();
    const reset = { tokenHash: recovery.tokenHash, email, organizationId: orgId, expiresAt: soon() };
    expect(await issuePilotPasswordReset({ ...reset, organizationId: "other-org" })).toBe(false);
    expect(await issuePilotPasswordReset(reset)).toBe(true);
    const result = await resetPassword(request({ resetToken: recovery.token, password: newPassword }));
    expect(result.status).toBe(200);
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await getSession(request(undefined, oldCookie))).status).toBe(401);
    expect((await login(request({ email, password }))).status).toBe(401);
    expect((await login(request({ email, password: newPassword }))).status).toBe(200);
    expect((await resetPassword(request({ resetToken: recovery.token, password }))).status).toBe(403);
  });

  it("revokes all current sessions on logout and rejects legacy, expired and malformed cookies", async () => {
    const orgId = await createOrganization();
    const invitation = await issueInvite(orgId);
    const account = await register(request({ ...enrolment, invitationToken: invitation.token }));
    const firstCookie = sessionCookie(account);
    const secondCookie = sessionCookie(await login(request({ email, password })));
    expect((await logout(request({}, firstCookie, { "sec-fetch-site": "same-site" }))).status).toBe(403);
    expect((await getSession(request(undefined, secondCookie))).status).toBe(200);
    expect((await logout(request({}, firstCookie))).status).toBe(200);
    expect((await getSession(request(undefined, firstCookie))).status).toBe(401);
    expect((await getSession(request(undefined, secondCookie))).status).toBe(401);
    const currentCookie = sessionCookie(await login(request({ email, password })));
    await logout(request({}, firstCookie));
    expect((await getSession(request(undefined, currentCookie))).status).toBe(200);

    const { user } = await account.json();
    for (const payload of [
      JSON.stringify({ userId: user.id, organizationId: orgId, expiresAt: soon().toISOString() }),
      JSON.stringify({ userId: user.id, organizationId: orgId, sessionVersion: 1, expiresAt: Date.now() - 1 }),
      "{"
    ]) {
      expect((await getSession(request(undefined, signedCookie(payload)))).status).toBe(401);
    }

    vi.stubEnv("PILOT_ACCESS_MODE", "closed");
    expect((await logout(request({}, currentCookie))).status).toBe(200);
    vi.stubEnv("PILOT_ACCESS_MODE", "invite");
    expect((await getSession(request(undefined, currentCookie))).status).toBe(401);
  });
});

async function createOrganization(name = "Pilot Team"): Promise<string> {
  const organization = await createPilotOrganization(name);
  if (!organization) throw new Error("Could not create a synthetic organisation.");
  return organization.id;
}

function soon() {
  return new Date(Date.now() + 60_000);
}

async function issueInvite(organizationId: string, expiresAt = soon()) {
  const credential = createPilotCredential();
  expect(await issuePilotInvitation({ tokenHash: credential.tokenHash, email, organizationId, role: "SELLER", expiresAt })).toBe(true);
  return credential;
}

function request(body?: unknown, cookie?: string, extraHeaders?: Record<string, string>) {
  const headers = new Headers(extraHeaders);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  return new Request("http://localhost/api/auth", {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error(`Expected a session cookie on ${response.status}.`);
  return cookie.split(";")[0];
}

function signedCookie(payload: string) {
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(encoded).digest("base64url");
  return `smart_training_session=${encoded}.${signature}`;
}
