import type { StartSessionRequest } from "@core/contracts";

import { requireSessionUser } from "@/lib/auth";
import { isNonEmptyString, jsonError, jsonResponse, readJson } from "@/lib/http";
import { createRateLimitResponse, isRateLimited } from "@/lib/rate-limit";
import { startSession } from "@/lib/roleplay";

export async function POST(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  const retryAfter = await isRateLimited({
    bucket: "session-start",
    identifier: user.id,
    limit: 20,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many session starts. Please wait before starting another one.",
      retryAfter
    );
  }

  const body = await readJson<StartSessionRequest>(request);
  if (!isNonEmptyString(body.scenarioId)) {
    return jsonError("Scenario id is required.");
  }

  const session = await startSession(user, body.scenarioId);
  if (!session) {
    return jsonError("Scenario not found.", 404);
  }

  return jsonResponse({ session }, 201);
}
