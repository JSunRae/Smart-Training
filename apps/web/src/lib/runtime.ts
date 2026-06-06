import type { HealthResponse } from "@core/contracts";

import { resolveApiOrigin } from "./api-origin";

export const DEFAULT_SUPPORT_NAME = "Smart Training Pilot Support";
export const PUBLIC_SUPPORT_CONTACT_ENV_VARS = [
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_SUPPORT_URL"
] as const;
export const PUBLIC_SUPPORT_CONTACT_REQUIREMENT =
  "Hosted launch requires /privacy to show at least one operator-facing support contact. Set NEXT_PUBLIC_SUPPORT_EMAIL or NEXT_PUBLIC_SUPPORT_URL.";

type SupportRuntimeEnv = Partial<
  Record<"NEXT_PUBLIC_SUPPORT_EMAIL" | "NEXT_PUBLIC_SUPPORT_NAME" | "NEXT_PUBLIC_SUPPORT_URL", string | undefined>
>;

function normalizeRuntimeValue(value?: string): null | string {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function readPublicSupportContact(
  env: NodeJS.ProcessEnv | SupportRuntimeEnv = process.env
) {
  const email = normalizeRuntimeValue(env.NEXT_PUBLIC_SUPPORT_EMAIL);
  const name = normalizeRuntimeValue(env.NEXT_PUBLIC_SUPPORT_NAME) || DEFAULT_SUPPORT_NAME;
  const url = normalizeRuntimeValue(env.NEXT_PUBLIC_SUPPORT_URL);

  return {
    email,
    name,
    requiredEnvVars: PUBLIC_SUPPORT_CONTACT_ENV_VARS,
    requirement: PUBLIC_SUPPORT_CONTACT_REQUIREMENT,
    url,
    visibleOnPrivacyPage: Boolean(email || url)
  };
}

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
