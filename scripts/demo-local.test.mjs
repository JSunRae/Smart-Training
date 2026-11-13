import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import {
  canCopySource,
  demoEnvironment,
  parsePorts,
  requireFreePort,
  startDemo
} from "./demo-local.mjs";

describe("isolated local demonstration", () => {
  it("does not start an already-cancelled demo", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(startDemo(undefined, { signal: controller.signal })).rejects.toMatchObject({
      name: "AbortError"
    });
  });

  it("uses separate non-privileged ports", () => {
    expect(parsePorts()).toEqual({ web: 4310, api: 4311 });
    expect(parsePorts(["--web-port", "4320", "--api-port", "4321"])).toEqual({
      web: 4320,
      api: 4321
    });
    for (const args of [
      ["--web-port", "443"],
      ["--web-port", "65536"],
      ["--web-port"],
      ["--host", "0.0.0.0"],
      ["--web-port", "4311"]
    ]) {
      expect(() => parsePorts(args)).toThrow();
    }
  });

  it("copies source and synthetic seeds but never environment files or stored accounts", () => {
    expect(canCopySource("apps/api/src/lib/store.ts")).toBe(true);
    expect(canCopySource("packages/core/src/contracts.ts")).toBe(true);
    expect(canCopySource("apps/api/data/seed-data.json")).toBe(true);
    for (const relative of [
      "apps/api/.env",
      "apps/web/.ENV.local",
      "apps/api/data/store.json",
      "apps/api/data/demo-store.json",
      "apps/api/node_modules/key.txt",
      "apps/web/.next/server.js",
      "apps/web/../private.txt",
      "private/file.txt"
    ]) {
      expect(canCopySource(relative)).toBe(false);
    }
  });

  it("discards inherited provider credentials and forces local, non-AI behavior", () => {
    const env = demoEnvironment(
      {
        PATH: "tool-path",
        DATABASE_URL: "postgres://not-for-demo",
        OPENAI_API_KEY: "not-for-demo",
        RENDER_API_KEY: "not-for-demo",
        NODE_OPTIONS: "not-for-demo"
      },
      4311
    );
    expect(env.PATH).toBe("tool-path");
    expect(env.DATABASE_URL).toBe("");
    expect(env.OPENAI_API_KEY).toBe("");
    expect(env).not.toHaveProperty("RENDER_API_KEY");
    expect(env).not.toHaveProperty("NODE_OPTIONS");
    expect(env.OPENAI_TEXT_ENABLED).toBe("false");
    expect(env.VOICE_LAB_ENABLED).toBe("false");
    expect(env.INTERNAL_API_ORIGIN).toBe("http://127.0.0.1:4311");
    expect(env.NEXT_PUBLIC_SUPPORT_EMAIL).toBe("Jason_C_Rae@Outlook.com");
    expect(env.DATA_ENCRYPTION_KEY).toMatch(/^[a-f0-9]{64}$/);
    expect(env.DATA_ENCRYPTION_KEY).not.toBe(demoEnvironment({}, 4311).DATA_ENCRYPTION_KEY);
  });

  it("rejects occupied ports without stopping the listener", async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      await expect(requireFreePort(server.address().port)).rejects.toThrow("occupied");
      expect(server.listening).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
