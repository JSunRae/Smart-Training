import type { HealthResponse } from "@core/contracts";

import { resolveApiOrigin } from "./api-origin";

export async function readApiHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${resolveApiOrigin()}/api/health`, {
      cache: "no-store"
    });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}
