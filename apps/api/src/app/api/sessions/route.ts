import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { listSessionSummaries } from "@/lib/roleplay";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  const sessions = await listSessionSummaries(user.id, user.organizationId);
  return jsonResponse({ sessions });
}
