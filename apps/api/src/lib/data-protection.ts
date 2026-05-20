import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

import { getDataEncryptionKey } from "./env";

const ENCRYPTED_PREFIX = "enc:v1";
const LOOKUP_SECRET_FALLBACK = "smart-training-lookup-dev-secret";

export function encryptNullableString(value: null | string): null | string {
  return value === null ? null : encryptString(value);
}

export function decryptNullableString(value: null | string): null | string {
  return value === null ? null : decryptString(value);
}

export function encryptString(value: string): string {
  const key = getDataEncryptionKey();
  if (!key || value.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url")
  ].join(":");
}

export function decryptString(value: string): string {
  if (!value.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return value;
  }

  const key = getDataEncryptionKey();
  if (!key) {
    throw new Error(
      "Stored data is encrypted but DATA_ENCRYPTION_KEY is not configured for decryption."
    );
  }

  const [, , iv, ciphertext, tag] = value.split(":");
  if (!iv || !ciphertext || !tag) {
    throw new Error("Encrypted store value is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

export function createLookupHash(namespace: string, value: string): string {
  const key =
    getDataEncryptionKey() ??
    Buffer.from(process.env.APP_SESSION_SECRET?.trim() || LOOKUP_SECRET_FALLBACK, "utf8");

  return createHmac("sha256", key).update(`${namespace}:${value}`).digest("hex");
}
