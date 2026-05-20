import type { MessageRequest } from "@core/contracts";

import { requireSessionUser } from "@/lib/auth";
import { isNonEmptyString, jsonError, jsonResponse, readJson } from "@/lib/http";
import { createRateLimitResponse, isRateLimited } from "@/lib/rate-limit";
import { addBuyerTurn } from "@/lib/roleplay";

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  const retryAfter = await isRateLimited({
    bucket: "session-message",
    identifier: user.id,
    limit: 120,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many seller turns submitted. Please slow down and try again shortly.",
      retryAfter
    );
  }

  const body = await readJson<MessageRequest>(request);
  if (!isNonEmptyString(body.content)) {
    return jsonError("Message content is required.");
  }

  const { sessionId } = await context.params;

  try {
    const result = await addBuyerTurn(
      sessionId,
      user.id,
      user.organizationId,
      body.content.trim()
    );
    if (!result) {
      return jsonError("Session not found.", 404);
    }

    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 409);
    }

    return jsonError("Unable to add message.", 500);
  }
}
