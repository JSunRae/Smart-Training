import type { LoginRequest } from "@core/contracts";

import { createSessionResponse, verifyPassword } from "@/lib/auth";
import { isNonEmptyString, jsonError, readJson } from "@/lib/http";
import {
  createRateLimitResponse,
  getRequestIdentifier,
  isRateLimited
} from "@/lib/rate-limit";
import { getAccountByEmail, markTranscriptConsent } from "@/lib/repository";
import { toAuthResponse } from "@/lib/roleplay";

export async function POST(request: Request) {
  const body = await readJson<LoginRequest>(request);

  if (!isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
    return jsonError("Email and password are required.");
  }

  const email = body.email.trim().toLowerCase();
  const rateLimitKey = `${getRequestIdentifier(request)}:${email}`;
  const retryAfter = await isRateLimited({
    bucket: "auth-login",
    identifier: rateLimitKey,
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

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return jsonError("Invalid email or password.", 401);
  }

  const organization = account.organization;
  if (!organization) {
    return jsonError("Organization not found for this account.", 404);
  }

  if (!user.transcriptConsentAt && !body.acceptTranscriptConsent) {
    return jsonError("Transcript consent is required before a session can be recorded.");
  }

  const sessionUser =
    !user.transcriptConsentAt && body.acceptTranscriptConsent
      ? await markTranscriptConsent(user.id, user.organizationId)
      : {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
          transcriptConsentAt: user.transcriptConsentAt ? new Date(user.transcriptConsentAt) : null,
          organization
        };

  if (!sessionUser) {
    return jsonError("Unable to load the authenticated user.", 500);
  }

  return createSessionResponse(sessionUser, toAuthResponse(sessionUser));
}
