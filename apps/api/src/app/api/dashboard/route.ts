import type { DashboardResponse } from "@core/contracts";

import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import {
  listAccessibleScenarios,
  listSessionSummaries,
  toAuthUser
} from "@/lib/roleplay";
import { ensureSeedData } from "@/lib/seed";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  await ensureSeedData();

  const [scenarios, sessions] = await Promise.all([
    listAccessibleScenarios(user.organizationId),
    listSessionSummaries(user.id, user.organizationId)
  ]);

  const response: DashboardResponse = {
    user: toAuthUser(user),
    scenarios,
    sessions
  };

  return jsonResponse(response);
}
