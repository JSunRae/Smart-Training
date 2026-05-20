import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { createRateLimitResponse, isRateLimited } from "@/lib/rate-limit";
import { completeSession } from "@/lib/roleplay";

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
    bucket: "session-complete",
    identifier: user.id,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });
  if (retryAfter) {
    return createRateLimitResponse(
      "Too many session completion attempts. Please wait before retrying.",
      retryAfter
    );
  }

  const { sessionId } = await context.params;
  const session = await completeSession(sessionId, user.id, user.organizationId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }

  return jsonResponse({ session });
}
