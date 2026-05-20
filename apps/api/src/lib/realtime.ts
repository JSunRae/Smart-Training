import { buildBuyerPrompt } from "@core/prompts";

import { createLookupHash } from "./data-protection";
import { canUseVoiceLab, hasOpenAiApiKey, isVoiceLabEnabled } from "./env";
import { buildContextSnippets } from "./roleplay";
import type { DocumentRecord, ScenarioRecord } from "./store";

export function isRealtimeVoiceConfigured(): boolean {
  return hasOpenAiApiKey();
}

export function isRealtimeVoiceEnabled(): boolean {
  return isVoiceLabEnabled();
}

export function isRealtimeVoiceActive(): boolean {
  return canUseVoiceLab();
}

export function getRealtimeVoiceModel(): string {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime";
}

export function getRealtimeVoiceName(): string {
  return process.env.OPENAI_REALTIME_VOICE?.trim() || "marin";
}

export function createOpenAiSafetyIdentifier(
  userId: string,
  organizationId: string
): string {
  return createLookupHash("openai-safety", `${organizationId}:${userId}`);
}

export function buildRealtimeBuyerInstructions(
  scenario: ScenarioRecord,
  documents: DocumentRecord[]
): {
  instructions: string;
  snippets: string[];
} {
  const snippets = buildContextSnippets(scenario, documents).map((snippet) => snippet.text);

  return {
    instructions: [
      buildBuyerPrompt(scenario.buyerCompany, scenario.title),
      `You are speaking live as the buyer persona for this roleplay.`,
      `Buyer role: ${scenario.buyerRole}.`,
      `Buyer tone: ${scenario.buyerTone}.`,
      `Primary challenge: ${scenario.challenge}.`,
      `Seller goal: ${scenario.goal}.`,
      `Relevant context: ${snippets.length > 0 ? snippets.join(" | ") : "Use the scenario description only."}`,
      `Open the conversation with this angle: ${scenario.openingLine}.`,
      "Speak in natural short turns, stay skeptical, ask for proof, and do not mention being an AI."
    ].join("\n"),
    snippets
  };
}
