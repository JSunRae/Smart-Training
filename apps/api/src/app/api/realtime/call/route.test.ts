import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as register } from "../../auth/register/route";
import { POST as createRealtimeCall } from "./route";

let tempDirectory = "";
let storeFileName = "";

describe("realtime call route", () => {
  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), "smart-training-realtime-"));
    storeFileName = `${path.basename(tempDirectory)}.json`;
    process.env.SMART_TRAINING_DB_PATH = storeFileName;
    process.env.APP_SESSION_SECRET = "test-session-secret";
    delete process.env.OPENAI_API_KEY;
    delete process.env.VOICE_LAB_ENABLED;
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    delete process.env.SMART_TRAINING_DB_PATH;
    delete process.env.APP_SESSION_SECRET;
    delete process.env.OPENAI_API_KEY;
    delete process.env.VOICE_LAB_ENABLED;
    delete process.env.DATABASE_URL;

    if (tempDirectory) {
      await rm(tempDirectory, { force: true, recursive: true });
      tempDirectory = "";
    }

    if (storeFileName) {
      await rm(path.join(process.cwd(), "data", storeFileName), { force: true });
      storeFileName = "";
    }
  });

  it("returns 403 when the voice lab is disabled", async () => {
    const registerResponse = await register(
      createRequest("/api/auth/register", "POST", {
        email: "voice@example.com",
        name: "Voice Tester",
        organizationName: "Voice Org",
        password: "LaunchReady2026",
        acceptTranscriptConsent: true
      })
    );

    const cookie = registerResponse.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const response = await createRealtimeCall(
      createRequest(
        "/api/realtime/call",
        "POST",
        {
          scenarioId: "missing",
          sdp: "v=0"
        },
        cookie
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Voice lab is disabled for this deployment."
    });
  });

  it("returns 503 when realtime voice is enabled without credentials", async () => {
    process.env.VOICE_LAB_ENABLED = "true";

    const registerResponse = await register(
      createRequest("/api/auth/register", "POST", {
        email: "voice-enabled@example.com",
        name: "Voice Tester",
        organizationName: "Voice Org",
        password: "LaunchReady2026",
        acceptTranscriptConsent: true
      })
    );

    const cookie = registerResponse.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const response = await createRealtimeCall(
      createRequest(
        "/api/realtime/call",
        "POST",
        {
          scenarioId: "missing",
          sdp: "v=0"
        },
        cookie
      )
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Realtime voice is unavailable. Configure OPENAI_API_KEY before using the voice lab."
    });
  });
});

function createRequest(
  pathname: string,
  method = "GET",
  body?: unknown,
  cookie?: null | string
): Request {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return new Request(`http://localhost${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
