import type { ResetPasswordRequest } from "@core/contracts";

import { createLogoutResponse, hashPassword, validatePassword } from "@/lib/auth";
import { isNonEmptyString, jsonError, readJson } from "@/lib/http";
import { getPilotAccessMode, readPilotTokenHash } from "@/lib/pilot-access";
import { redeemPilotPasswordReset } from "@/lib/pilot-access-repository";
import { createRateLimitResponse, getRequestIdentifier, isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (getPilotAccessMode() !== "invite") {
    return jsonError("Pilot password recovery is unavailable.", 403);
  }

  const body = await readJson<ResetPasswordRequest | null>(request).catch(() => null);
  if (!body || !isNonEmptyString(body.password)) return jsonError("A new password is required.");

  const passwordError = validatePassword(body.password);
  if (passwordError) return jsonError(passwordError);

  const tokenHash = readPilotTokenHash(body.resetToken);
  if (!tokenHash) return jsonError("This reset code is invalid or expired.", 403);

  const retryAfter = await isRateLimited({
    bucket: "auth-reset",
    identifier: getRequestIdentifier(request),
    limit: 6,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) return createRateLimitResponse("Too many reset attempts. Please wait.", retryAfter);

  const changed = await redeemPilotPasswordReset({
    tokenHash,
    createPasswordHash: () => hashPassword(body.password)
  });
  if (!changed) return jsonError("This reset code is invalid or expired.", 403);

  return createLogoutResponse();
}
