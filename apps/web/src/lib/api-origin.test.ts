import { describe, expect, it } from "vitest";

import { resolveApiOrigin } from "./api-origin";

describe("resolveApiOrigin", () => {
  it("prefers an explicit internal origin", () => {
    expect(
      resolveApiOrigin({
        INTERNAL_API_ORIGIN: "https://api.example.com/",
        INTERNAL_API_HOSTPORT: "smart-training-api:10000",
        NEXT_PUBLIC_API_ORIGIN: "https://public.example.com"
      })
    ).toBe("https://api.example.com");
  });

  it("falls back to a private hostport before the public origin", () => {
    expect(
      resolveApiOrigin({
        INTERNAL_API_HOSTPORT: "http://smart-training-api:10000/",
        NEXT_PUBLIC_API_ORIGIN: "https://public.example.com"
      })
    ).toBe("http://smart-training-api:10000");
  });

  it("uses the public origin when no internal route is provided", () => {
    expect(
      resolveApiOrigin({
        NEXT_PUBLIC_API_ORIGIN: "https://public.example.com/"
      })
    ).toBe("https://public.example.com");
  });

  it("defaults to localhost for local development", () => {
    expect(resolveApiOrigin({})).toBe("http://localhost:3001");
  });
});
