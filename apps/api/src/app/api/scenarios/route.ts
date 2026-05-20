import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse } from "@/lib/http";
import { listAccessibleScenarios } from "@/lib/roleplay";
import { ensureSeedData } from "@/lib/seed";

export async function GET(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  await ensureSeedData();
  const scenarios = await listAccessibleScenarios(user.organizationId);
  return jsonResponse({ scenarios });
}
