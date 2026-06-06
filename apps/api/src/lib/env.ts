const DEFAULT_SESSION_RETENTION_DAYS = 30;
const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isFileStoreProductionOverrideEnabled(): boolean {
  return isFlagEnabled("ALLOW_FILE_STORAGE_IN_PRODUCTION");
}

export function hasOpenAiApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function isOpenAiTextEnabled(): boolean {
  return isFlagEnabled("OPENAI_TEXT_ENABLED");
}

export function canUseOpenAiText(): boolean {
  return isOpenAiTextEnabled() && hasOpenAiApiKey();
}

export function isVoiceLabEnabled(): boolean {
  return isFlagEnabled("VOICE_LAB_ENABLED");
}

export function canUseVoiceLab(): boolean {
  return isVoiceLabEnabled() && hasOpenAiApiKey();
}

export function getSessionRetentionDays(): null | number {
  const configured = process.env.SESSION_RETENTION_DAYS?.trim();
  if (!configured) {
    return DEFAULT_SESSION_RETENTION_DAYS;
  }

  const parsed = Number.parseInt(configured, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error("SESSION_RETENTION_DAYS must be an integer.");
  }

  if (parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getRequiredSessionSecret(defaultValue: string): string {
  const configured = process.env.APP_SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (isProduction()) {
    throw new Error("APP_SESSION_SECRET must be configured in production.");
  }

  return defaultValue;
}

export function getDataEncryptionKey(): Buffer | null {
  const configured = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!configured) {
    if (isProduction()) {
      throw new Error(
        "DATA_ENCRYPTION_KEY must be configured in production to protect stored transcripts."
      );
    }

    return null;
  }

  const base64Candidate = Buffer.from(configured, "base64url");
  if (base64Candidate.length === 32) {
    return base64Candidate;
  }

  const hexCandidate = /^[a-fA-F0-9]{64}$/.test(configured)
    ? Buffer.from(configured, "hex")
    : null;
  if (hexCandidate?.length === 32) {
    return hexCandidate;
  }

  throw new Error(
    "DATA_ENCRYPTION_KEY must decode to exactly 32 bytes. Use a base64url or 64-character hex key."
  );
}

function isFlagEnabled(name: string): boolean {
  const configured = process.env[name]?.trim().toLowerCase();
  return configured ? TRUTHY_ENV_VALUES.has(configured) : false;
}
