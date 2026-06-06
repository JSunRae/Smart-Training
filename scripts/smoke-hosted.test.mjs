import { describe, expect, it } from "vitest";

import {
  assertOkJsonResponse,
  readJson,
  resolveSmokeConfig,
  validateHealthBody,
  validatePrivacyHtml
} from "./smoke-hosted.mjs";

describe("smoke-hosted helpers", () => {
  it("requires an API origin from args or env", () => {
    expect(() => resolveSmokeConfig([], {})).toThrow(
      /Missing required environment variable SMART_TRAINING_API_ORIGIN/
    );
  });

  it("rejects an invalid API origin", () => {
    expect(() => resolveSmokeConfig(["--api", "not-a-url"], {})).toThrow(
      /--api \/ SMART_TRAINING_API_ORIGIN must be an absolute URL/
    );
  });

  it("rejects invalid boolean expectations", () => {
    expect(() =>
      resolveSmokeConfig(
        ["--api", "https://api.example.com", "--expect-openai-text-enabled", "maybe"],
        {}
      )
    ).toThrow(/Invalid boolean value for SMART_TRAINING_EXPECT_OPENAI_TEXT_ENABLED: maybe/);
  });

  it("surfaces non-200 health failures with the response body", async () => {
    const response = new Response(JSON.stringify({ error: "downstream unavailable" }), {
      headers: {
        "content-type": "application/json"
      },
      status: 503
    });

    await expect(assertOkJsonResponse(response, "/api/health")).rejects.toThrow(
      '/api/health failed with 503: {"error":"downstream unavailable"}'
    );
  });

  it("rejects invalid JSON health responses", async () => {
    const response = new Response("<html>bad gateway</html>", {
      headers: {
        "content-type": "text/html"
      },
      status: 200
    });

    await expect(readJson(response)).rejects.toThrow(
      /Expected JSON response but received text\/html: <html>bad gateway<\/html>/
    );
  });

  it("rejects a health body that does not report ok", () => {
    expect(() =>
      validateHealthBody(
        {
          status: "degraded"
        },
        {
          expectedOpenAiTextEnabled: false,
          expectedStorageBackend: "postgres",
          expectedVoiceLabEnabled: false
        }
      )
    ).toThrow(/Health check did not return status ok/);
  });

  it("requires the expected support email when configured", () => {
    expect(() =>
      validatePrivacyHtml("<html><body>30-day retention mailto:other@example.com</body></html>", {
        expectedSupportEmail: "pilot-support@example.com"
      })
    ).toThrow(/Hosted \/privacy page did not include the expected support email/);
  });

  it("requires a visible support contact when no explicit expectation is configured", () => {
    expect(() => validatePrivacyHtml("<html><body>30-day retention</body></html>")).toThrow(
      /Hosted \/privacy page did not expose a support email or support portal/
    );
  });
});