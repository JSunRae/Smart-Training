import { describe, expect, it } from "vitest";
import { readSiteMode, validateNetlifyDeployment } from "./site-mode";

describe("website deployment boundary", () => {
  it("preserves local demos but defaults an unconfigured Netlify site to marketing", () => {
    expect(readSiteMode({})).toBe("workspace");
    expect(readSiteMode({ NETLIFY: "true" })).toBe("marketing");
    expect(() => readSiteMode({ SMART_TRAINING_SITE_MODE: "typo" })).toThrow();
  });

  it("does not need a backend for a marketing deployment", () => {
    expect(() => validateNetlifyDeployment({ NETLIFY: "true" })).not.toThrow();
  });

  it("requires an explicit public API origin before exposing a pilot", () => {
    const env = { NETLIFY: "true", SMART_TRAINING_SITE_MODE: "pilot" };
    for (const origin of [
      undefined,
      "http://localhost:3001",
      "https://127.0.0.1",
      "https://api.local",
      "https://api.example.com/api",
      "https://user:secret@api.example.com",
      "https://api.example.com?key=secret"
    ]) {
      expect(() => validateNetlifyDeployment({ ...env, INTERNAL_API_ORIGIN: origin })).toThrow();
    }
    expect(() =>
      validateNetlifyDeployment({
        ...env,
        INTERNAL_API_ORIGIN: "https://smart-training-api.onrender.com"
      })
    ).not.toThrow();
    expect(() =>
      validateNetlifyDeployment({
        ...env,
        INTERNAL_API_ORIGIN: "https://api.example.com",
        INTERNAL_API_HOSTPORT: "api:10000"
      })
    ).toThrow();
    expect(() =>
      validateNetlifyDeployment({ NETLIFY: "true", SMART_TRAINING_SITE_MODE: "workspace" })
    ).toThrow();
  });
});
