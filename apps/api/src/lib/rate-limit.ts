import { NextResponse } from "next/server";

import { getStorageBackend } from "./database-config";
import { withPostgresTransaction } from "./postgres";

type RateLimitOptions = {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type BucketEntry = {
  count: number;
  resetAt: number;
};

const globalState = globalThis as typeof globalThis & {
  __smartTrainingRateLimits?: Map<string, BucketEntry>;
};

const buckets = globalState.__smartTrainingRateLimits ?? new Map<string, BucketEntry>();
globalState.__smartTrainingRateLimits = buckets;

export function createRateLimitResponse(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}

export function getRequestIdentifier(request: Request, fallback = "anonymous"): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (connectingIp) {
    return connectingIp;
  }

  return fallback;
}

export async function isRateLimited(options: RateLimitOptions): Promise<null | number> {
  if (getStorageBackend() === "postgres") {
    return withPostgresTransaction(async (client) => {
      await client.query(`DELETE FROM rate_limit_windows WHERE expires_at <= NOW()`);

      const result = await client.query(
        `
          INSERT INTO rate_limit_windows (
            bucket,
            identifier,
            attempt_count,
            window_started_at,
            expires_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            1,
            NOW(),
            NOW() + (($3::text || ' milliseconds')::interval),
            NOW()
          )
          ON CONFLICT (bucket, identifier)
          DO UPDATE
          SET
            attempt_count = CASE
              WHEN rate_limit_windows.expires_at <= NOW() THEN 1
              ELSE rate_limit_windows.attempt_count + 1
            END,
            window_started_at = CASE
              WHEN rate_limit_windows.expires_at <= NOW() THEN NOW()
              ELSE rate_limit_windows.window_started_at
            END,
            expires_at = CASE
              WHEN rate_limit_windows.expires_at <= NOW()
                THEN NOW() + (($3::text || ' milliseconds')::interval)
              ELSE rate_limit_windows.expires_at
            END,
            updated_at = NOW()
          RETURNING attempt_count, expires_at
        `,
        [options.bucket, options.identifier, options.windowMs]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      if (Number(row.attempt_count) <= options.limit) {
        return null;
      }

      const retryAfterMs = new Date(String(row.expires_at)).getTime() - Date.now();
      return Math.max(1, Math.ceil(retryAfterMs / 1000));
    });
  }

  const now = Date.now();
  const key = `${options.bucket}:${options.identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return null;
  }

  if (existing.count >= options.limit) {
    return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  }

  existing.count += 1;
  return null;
}
