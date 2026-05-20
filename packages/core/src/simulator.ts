import type { ScenarioSummary, SessionMessage, SessionStatus } from "./contracts";

export type KnowledgeSnippet = {
  source: string;
  text: string;
  score: number;
};

type BuyerReplyInput = {
  scenario: ScenarioSummary;
  snippets: KnowledgeSnippet[];
  userMessage: string;
};

type CoachReplyInput = {
  scenario: ScenarioSummary;
  snippets: KnowledgeSnippet[];
  messages: SessionMessage[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "we",
  "you",
  "your"
]);

export function chunkText(text: string, chunkSize = 700, overlap = 100): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export function rankKnowledgeSnippets(
  query: string,
  knowledgeBase: Array<{ source: string; text: string }>,
  limit = 3
): KnowledgeSnippet[] {
  const queryTerms = tokenize(query);

  return knowledgeBase
    .map((entry) => {
      const haystack = `${entry.source} ${entry.text}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => {
        if (!term) {
          return total;
        }

        const occurrences = haystack.split(term).length - 1;
        return total + occurrences;
      }, 0);

      return {
        source: entry.source,
        text: entry.text,
        score
      };
    })
    .filter((snippet) => snippet.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function buildOpeningBuyerMessage(
  scenario: ScenarioSummary,
  snippets: KnowledgeSnippet[]
): string {
  const evidence = snippets[0]?.text;
  const evidenceSentence = evidence
    ? ` I need proof this changes ${truncateSentence(evidence, 120)}`
    : "";

  return `${scenario.buyerCompany}'s ${scenario.buyerRole} speaking. ${scenario.challenge} ${scenario.goal} is the only outcome I care about.${evidenceSentence}`;
}

export function buildDeterministicBuyerReply({
  scenario,
  snippets,
  userMessage
}: BuyerReplyInput): string {
  const strongestSnippet = snippets[0]?.text;
  const quotedPoint = summarizeUserPoint(userMessage);
  const pushback =
    strongestSnippet && strongestSnippet.length > 0
      ? `You are pointing at ${truncateSentence(strongestSnippet, 110)}, but how would that show up inside the first 30 days?`
      : `You are asking me to trust a broad promise. What would change first if we moved forward?`;

  return [
    `I heard your point about ${quotedPoint}.`,
    pushback,
    `If ${scenario.goal.toLowerCase()} is realistic, give me the measurable milestone you would hold your team to.`
  ].join(" ");
}

export function buildDeterministicCoachReply({
  scenario,
  snippets,
  messages
}: CoachReplyInput): string {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "USER")?.content ?? "";
  const weakestArea = latestUserMessage.toLowerCase().includes("feature")
    ? "feature framing"
    : "commercial precision";
  const evidence = snippets[0]?.text;
  const evidenceLine = evidence
    ? `Use the context that ${truncateSentence(evidence, 100)}`
    : `Tie your insight directly to ${scenario.challenge.toLowerCase()}`;

  return [
    `Coach note: your latest turn needs sharper ${weakestArea}.`,
    `Lead with the business tension, then connect it to ${scenario.goal.toLowerCase()}.`,
    evidenceLine + ".",
    `End with one concrete question the buyer can answer now.`
  ].join(" ");
}

export function getNextRecommendedAction(
  status: SessionStatus,
  messages: SessionMessage[]
): string {
  if (status !== "ACTIVE") {
    return "Review the transcript and decide whether this scenario needs another practice run.";
  }

  const latest = messages[messages.length - 1];
  if (!latest) {
    return "Open with a commercial insight and ask the buyer to confirm the current risk.";
  }

  if (latest.role === "ASSISTANT") {
    return "Answer the buyer's challenge with evidence, then ask a measurable follow-up question.";
  }

  if (latest.role === "COACH") {
    return "Apply the coach guidance immediately in your next seller turn.";
  }

  return "Pause for coach input if the conversation feels generic or feature-led.";
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function summarizeUserPoint(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "a general value claim";
  }

  return truncateSentence(trimmed.replace(/\s+/g, " "), 90).replace(/[.?!]+$/, "");
}

function truncateSentence(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return value.slice(0, Math.max(0, limit - 1)).trimEnd() + "…";
}
