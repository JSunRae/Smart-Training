import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { createRateLimitResponse, isRateLimited } from "@/lib/rate-limit";
import { addCoachTurn } from "@/lib/roleplay";

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
    bucket: "session-coach",
    identifier: user.id,
    limit: 40,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many coach requests. Please wait before requesting more guidance.",
      retryAfter
    );
  }

  const { sessionId } = await context.params;

  try {
    const result = await addCoachTurn(sessionId, user.id, user.organizationId);
    if (!result) {
      return jsonError("Session not found.", 404);
    }

    return jsonResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 409);
    }

    return jsonError("Unable to add coach response.", 500);
  }
}
