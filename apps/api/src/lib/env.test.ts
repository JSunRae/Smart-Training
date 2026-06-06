import { afterEach, describe, expect, it } from "vitest";

import {
  canUseOpenAiText,
  canUseVoiceLab,
  hasOpenAiApiKey,
  isOpenAiTextEnabled,
  isVoiceLabEnabled
} from "./env";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalOpenAiTextEnabled = process.env.OPENAI_TEXT_ENABLED;
const originalVoiceLabEnabled = process.env.VOICE_LAB_ENABLED;

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalOpenAiApiKey);
  restoreEnv("OPENAI_TEXT_ENABLED", originalOpenAiTextEnabled);
  restoreEnv("VOICE_LAB_ENABLED", originalVoiceLabEnabled);
});

describe("OpenAI opt-in environment contract", () => {
  it("does not activate OpenAI-backed features when only OPENAI_API_KEY is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";

    expect(hasOpenAiApiKey()).toBe(true);
    expect(isOpenAiTextEnabled()).toBe(false);
    expect(isVoiceLabEnabled()).toBe(false);
    expect(canUseOpenAiText()).toBe(false);
    expect(canUseVoiceLab()).toBe(false);
  });

  it("requires both OPENAI_TEXT_ENABLED and OPENAI_API_KEY for text generation", () => {
    process.env.OPENAI_TEXT_ENABLED = "true";

    expect(isOpenAiTextEnabled()).toBe(true);
    expect(canUseOpenAiText()).toBe(false);

    process.env.OPENAI_API_KEY = "sk-test";

    expect(canUseOpenAiText()).toBe(true);
  });

  it("requires both VOICE_LAB_ENABLED and OPENAI_API_KEY for voice lab", () => {
    process.env.VOICE_LAB_ENABLED = "true";

    expect(isVoiceLabEnabled()).toBe(true);
    expect(canUseVoiceLab()).toBe(false);

    process.env.OPENAI_API_KEY = "sk-test";

    expect(canUseVoiceLab()).toBe(true);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}