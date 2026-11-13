import type { RegisterRequest } from "@core/contracts";

import {
  createSessionResponse,
  hashPassword,
  validatePassword
} from "@/lib/auth";
import { isNonEmptyString, jsonError, readJson } from "@/lib/http";
import { getPilotAccessMode, normalizePilotEmail, readPilotTokenHash } from "@/lib/pilot-access";
import { redeemPilotInvitation } from "@/lib/pilot-access-repository";
import {
  createRateLimitResponse,
  getRequestIdentifier,
  isRateLimited
} from "@/lib/rate-limit";
import { registerAccount } from "@/lib/repository";
import { toAuthResponse } from "@/lib/roleplay";
import { ensureSeedData } from "@/lib/seed";

export async function POST(request: Request) {
  const mode = getPilotAccessMode();
  if (mode === "closed") return jsonError("Account enrolment is closed.", 403);

  const body = await readJson<RegisterRequest | null>(request).catch(() => null);

  if (
    !body ||
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.password)
  ) {
    return jsonError("Name, email, and password are required.");
  }

  if (body.acceptTranscriptConsent !== true) {
    return jsonError("Transcript consent is required before a session can be recorded.");
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return jsonError(passwordError);
  }

  const retryAfter = await isRateLimited({
    bucket: "auth-register",
    identifier: getRequestIdentifier(request),
    limit: 6,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many registration attempts. Please wait before creating another account.",
      retryAfter
    );
  }

  if (mode === "invite") {
    const email = normalizePilotEmail(body.email);
    const tokenHash = readPilotTokenHash(body.invitationToken);
    if (!email || !tokenHash || "organizationName" in body || "organizationId" in body || "role" in body) {
      return jsonError("A valid invitation for this email is required.", 403);
    }
    if (body.name.trim().length > 120) return jsonError("Name must be at most 120 characters long.");

    const user = await redeemPilotInvitation({
      tokenHash,
      email,
      name: body.name,
      createPasswordHash: () => hashPassword(body.password)
    });
    if (!user) return jsonError("A valid invitation for this email is required.", 403);

    return createSessionResponse(user, toAuthResponse(user), 201);
  }

  if (!isNonEmptyString(body.organizationName)) return jsonError("Organization is required.");
  await ensureSeedData();

  const email = body.email.trim().toLowerCase();
  const result = await registerAccount({
    email,
    name: body.name,
    organizationName: body.organizationName,
    passwordHash: hashPassword(body.password)
  });

  if ("error" in result) {
    return jsonError(result.error, result.status);
  }

  return createSessionResponse(result.user, toAuthResponse(result.user), 201);
}
