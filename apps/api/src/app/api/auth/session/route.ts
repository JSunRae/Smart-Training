import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { toAuthResponse } from "@/lib/roleplay";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  return jsonResponse(toAuthResponse(user));
}
