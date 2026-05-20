import { createLogoutResponse, requireSessionUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { deleteAccountData } from "@/lib/repository";

export async function DELETE(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  await deleteAccountData(user.id, user.organizationId);

  return createLogoutResponse();
}
