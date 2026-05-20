import type { RegisterRequest } from "@core/contracts";

import {
  createSessionResponse,
  hashPassword,
  validatePassword
} from "@/lib/auth";
import { isNonEmptyString, jsonError, readJson } from "@/lib/http";
import {
  createRateLimitResponse,
  getRequestIdentifier,
  isRateLimited
} from "@/lib/rate-limit";
import { registerAccount } from "@/lib/repository";
import { toAuthResponse } from "@/lib/roleplay";
import { ensureSeedData } from "@/lib/seed";

export async function POST(request: Request) {
  const body = await readJson<RegisterRequest>(request);

  if (
    !isNonEmptyString(body.name) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.password) ||
    !isNonEmptyString(body.organizationName)
  ) {
    return jsonError("Name, email, password, and organization are required.");
  }

  if (!body.acceptTranscriptConsent) {
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
