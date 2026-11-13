import { createHash, randomBytes } from "node:crypto";

import { isProduction } from "./env";
import type { AccountAccessState } from "./store";

export type PilotAccessMode = "workspace" | "closed" | "invite";

export function getPilotAccessMode(): PilotAccessMode {
  const configured = process.env.PILOT_ACCESS_MODE?.trim();
  if (configured === "invite") return "invite";
  if (!isProduction() && (!configured || configured === "workspace")) return "workspace";
  return "closed";
}

export function canUseAccountInMode(
  accessState: AccountAccessState | undefined,
  mode: PilotAccessMode
): boolean {
  if (mode === "closed") return false;
  if (accessState === "active") return true;
  return mode === "workspace" && (accessState === undefined || accessState === "unapproved");
}

export function normalizePilotEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createPilotCredential(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function readPilotTokenHash(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? hashToken(token) : null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
