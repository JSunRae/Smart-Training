import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0"
};

export function jsonResponse<T>(
  body: T,
  status = 200,
  headers?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...headers
    }
  });
}

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return jsonResponse({ error: message }, status, headers);
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
