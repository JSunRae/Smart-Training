import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { getSessionDetail } from "@/lib/roleplay";

type Context = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  const { sessionId } = await context.params;
  const session = await getSessionDetail(sessionId, user.id, user.organizationId);
  if (!session) {
    return jsonError("Session not found.", 404);
  }

  return jsonResponse({ session });
}
