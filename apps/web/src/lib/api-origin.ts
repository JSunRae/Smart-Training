const DEFAULT_API_ORIGIN = "http://localhost:3001";

type ApiOriginEnvironment = Record<string, string | undefined> & {
  INTERNAL_API_HOSTPORT?: string;
  INTERNAL_API_ORIGIN?: string;
  NEXT_PUBLIC_API_ORIGIN?: string;
};

export function resolveApiOrigin(env: ApiOriginEnvironment = process.env): string {
  const internalOrigin = normalizeOrigin(env.INTERNAL_API_ORIGIN);
  if (internalOrigin) {
    return internalOrigin;
  }

  const internalHostport = normalizeHostport(env.INTERNAL_API_HOSTPORT);
  if (internalHostport) {
    return `http://${internalHostport}`;
  }

  const publicOrigin = normalizeOrigin(env.NEXT_PUBLIC_API_ORIGIN);
  if (publicOrigin) {
    return publicOrigin;
  }

  return DEFAULT_API_ORIGIN;
}

function normalizeHostport(value: string | undefined): null | string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeOrigin(value: string | undefined): null | string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/$/, "");
}
