import { createLogoutResponse, readSessionPayload } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { revokeSessionVersion } from "@/lib/pilot-access-repository";

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    return jsonError("Sign out from the Smart Training workspace.", 403);
  }

  const session = readSessionPayload(request);
  if (session) await revokeSessionVersion(session.userId, session.organizationId, session.sessionVersion);

  return createLogoutResponse();
}
