import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      storageBackend: "file",
      openAiApiConfigured: false,
      openAiTextEnabled: false,
      voiceLabEnabled: false
    });
  });
});
