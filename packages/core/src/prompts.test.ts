import { describe, expect, it } from "vitest";
import { buildBuyerPrompt, buildCoachPrompt } from "./prompts";

describe("prompt helpers", () => {
  it("injects company into buyer prompt", () => {
    expect(buildBuyerPrompt("Acme", "Cybersecurity")).toContain("Acme");
  });

  it("returns coach prompt with challenger language", () => {
    expect(buildCoachPrompt().toLowerCase()).toContain("challenger");
  });
});
