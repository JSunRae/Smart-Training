import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getRequiredSessionSecret } from "./env";
import { getSessionUserById } from "./repository";
import type { UserRecord } from "./store";

const COOKIE_NAME = "smart_training_session";
const DEFAULT_SECRET = "smart-training-dev-secret";
const SESSION_TTL_DAYS = 30;

type SessionPayload = {
  userId: string;
  organizationId: string;
  role: "ADMIN" | "TRAINER" | "SELLER";
  expiresAt: string;
};

export type SessionUser = {
  id: UserRecord["id"];
  email: UserRecord["email"];
  name: UserRecord["name"];
  organizationId: UserRecord["organizationId"];
  role: UserRecord["role"];
  transcriptConsentAt: Date | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");

  if (candidate.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(candidate, stored);
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) {
    return "Password must be at least 10 characters long.";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include upper-case, lower-case, and numeric characters.";
  }

  return null;
}

export function createSessionResponse(
  user: SessionUser,
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Vary: "Cookie"
    }
  });
  response.headers.append("Set-Cookie", serializeSessionCookie(user));
  return response;
}

export function createLogoutResponse() {
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Vary: "Cookie"
      }
    }
  );
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}

export async function requireSessionUser(request: Request): Promise<SessionUser | null> {
  const payload = readSessionPayload(request);
  if (!payload) {
    return null;
  }

  return getSessionUserById(payload.userId, payload.organizationId);
}

export function readSessionPayload(request: Request): SessionPayload | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const raw = cookies[COOKIE_NAME];
  if (!raw) {
    return null;
  }

  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (expectedSignature.length !== signature.length) {
    return null;
  }

  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
  if (new Date(payload.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return payload;
}

function serializeSessionCookie(user: SessionUser): string {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const payload: SessionPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    expiresAt: expiresAt.toISOString()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signedValue = `${encodedPayload}.${sign(encodedPayload)}`;

  return serializeCookie(COOKIE_NAME, signedValue, {
    expires: expiresAt,
    httpOnly: true,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production"
  });
}

function clearSessionCookie(): string {
  return serializeCookie(COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production"
  });
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  }
): string {
  const parts = [`${name}=${value}`];

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  parts.push(`Path=${options.path ?? "/"}`);

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(/;\s*/).reduce<Record<string, string>>((cookies, entry) => {
    const [name, ...rest] = entry.split("=");
    if (!name || rest.length === 0) {
      return cookies;
    }

    cookies[name] = rest.join("=");
    return cookies;
  }, {});
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getSessionSecret(): string {
  return getRequiredSessionSecret(DEFAULT_SECRET);
}
