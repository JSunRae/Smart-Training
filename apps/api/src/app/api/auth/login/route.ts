import type { LoginRequest } from "@core/contracts";

import { createSessionResponse, verifyPassword } from "@/lib/auth";
import { createLookupHash } from "@/lib/data-protection";
import { isNonEmptyString, jsonError, readJson } from "@/lib/http";
import { canUseAccountInMode, getPilotAccessMode } from "@/lib/pilot-access";
import {
  createRateLimitResponse,
  isRateLimited
} from "@/lib/rate-limit";
import { getAccountByEmail, markTranscriptConsent } from "@/lib/repository";
import { toAuthResponse } from "@/lib/roleplay";

export async function POST(request: Request) {
  const mode = getPilotAccessMode();
  if (mode === "closed") return jsonError("Workspace access is closed.", 403);

  const body = await readJson<LoginRequest | null>(request).catch(() => null);

  if (!body || !isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
    return jsonError("Email and password are required.");
  }

  const email = body.email.trim().toLowerCase();
  const retryAfter = await isRateLimited({
    bucket: "auth-login",
    identifier: createLookupHash("auth-login", email),
    limit: 12,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many login attempts. Please try again in a few minutes.",
      retryAfter
    );
  }

  const account = await getAccountByEmail(email);
  const user = account?.user;

  if (!user || !canUseAccountInMode(user.accessState, mode) || !verifyPassword(body.password, user.passwordHash)) {
    return jsonError("Invalid email or password.", 401);
  }

  const organization = account.organization;
  if (!organization) {
    return jsonError("Organization not found for this account.", 404);
  }

  const transcriptConsentAt = user.transcriptConsentAt;
  const accessState = user.accessState ?? "unapproved";
  const sessionVersion = user.sessionVersion ?? 0;
  if (!transcriptConsentAt && body.acceptTranscriptConsent !== true) {
    return jsonError("Transcript consent is required before a session can be recorded.");
  }

  const sessionUser = transcriptConsentAt
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        role: user.role,
        accessState,
        sessionVersion,
        transcriptConsentAt: new Date(transcriptConsentAt),
        organization
      }
    : await markTranscriptConsent(user.id, user.organizationId);

  if (!sessionUser || sessionUser.sessionVersion !== sessionVersion || !canUseAccountInMode(sessionUser.accessState, mode)) {
    return jsonError("Invalid email or password.", 401);
  }

  return createSessionResponse(sessionUser, toAuthResponse(sessionUser));
}
