import type {
  AuthResponse,
  AuthUser,
  ScenarioSummary,
  SessionDetail,
  SessionMessage,
  SessionSummary
} from "@core/contracts";
import { buildBuyerPrompt, buildCoachPrompt } from "@core/prompts";
import {
  buildDeterministicBuyerReply,
  buildDeterministicCoachReply,
  buildOpeningBuyerMessage,
  chunkText,
  getNextRecommendedAction,
  rankKnowledgeSnippets
} from "@core/simulator";
import OpenAI from "openai";

import type { SessionUser } from "./auth";
import { canUseOpenAiText } from "./env";
import {
  appendSessionMessages,
  completeSessionRecord,
  createSessionWithOpening,
  getHydratedSessionContext,
  getScenarioContext,
  listAccessibleScenarioRecords,
  listHydratedSessionSummaries
} from "./repository";
import type { HydratedSession, HydratedSessionContext } from "./repository";
import type {
  DocumentRecord,
  MessageRecord,
  ScenarioRecord
} from "./store";
import { nowIso } from "./store";

export function toAuthResponse(user: SessionUser): AuthResponse {
  return {
    user: toAuthUser(user)
  };
}

export function toAuthUser(user: SessionUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    transcriptConsentAt: user.transcriptConsentAt?.toISOString() ?? null,
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug
    }
  };
}

export async function listAccessibleScenarios(organizationId: string): Promise<ScenarioSummary[]> {
  const scenarios = await listAccessibleScenarioRecords(organizationId);
  return scenarios.map(toScenarioSummary);
}

export async function listSessionSummaries(
  userId: string,
  organizationId: string
): Promise<SessionSummary[]> {
  const sessions = await listHydratedSessionSummaries(userId, organizationId);
  return sessions.map(toSessionSummary);
}

export async function getSessionDetail(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<SessionDetail | null> {
  const session = await getHydratedSessionContext(sessionId, userId, organizationId);
  if (!session) {
    return null;
  }

  return toSessionDetail(
    session,
    buildContextSnippets(session.scenario, session.documents)
  );
}

export async function startSession(
  user: SessionUser,
  scenarioId: string
): Promise<SessionDetail | null> {
  const scenarioContext = await getScenarioContext(scenarioId, user.organizationId);
  if (!scenarioContext) {
    return null;
  }

  const snippets = buildContextSnippets(scenarioContext.scenario, scenarioContext.documents);
  const openingMessage =
    scenarioContext.scenario.openingLine ||
    buildOpeningBuyerMessage(toScenarioSummary(scenarioContext.scenario), snippets);
  const session = await createSessionWithOpening(user, scenarioId, openingMessage);

  return session ? toSessionDetail(session, snippets) : null;
}

export async function addBuyerTurn(
  sessionId: string,
  userId: string,
  organizationId: string,
  content: string
): Promise<{ session: SessionDetail; reply: SessionMessage } | null> {
  const session = await getHydratedSessionContext(sessionId, userId, organizationId);
  if (!session) {
    return null;
  }

  if (session.status !== "ACTIVE") {
    throw new Error("Session is no longer active.");
  }

  const snippets = buildContextSnippets(session.scenario, session.documents, content);
  const replyText = await generateBuyerReply(session, content, snippets);

  const updatedSession = await appendSessionMessages(
    sessionId,
    userId,
    organizationId,
    [
      { role: "USER", content },
      { role: "ASSISTANT", content: replyText }
    ]
  );
  if (!updatedSession) {
    return null;
  }

  const detail = toSessionDetail(updatedSession, snippets);
  return {
    session: detail,
    reply: detail.messages[detail.messages.length - 1]
  };
}

export async function addCoachTurn(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<{ session: SessionDetail; reply: SessionMessage } | null> {
  const session = await getHydratedSessionContext(sessionId, userId, organizationId);
  if (!session) {
    return null;
  }

  if (session.status !== "ACTIVE") {
    throw new Error("Session is no longer active.");
  }

  const latestUserMessage =
    [...session.messages].reverse().find((message) => message.role === "USER")?.content ?? "";
  const snippets = buildContextSnippets(session.scenario, session.documents, latestUserMessage);
  const replyText = await generateCoachReply(session, snippets);

  const updatedSession = await appendSessionMessages(
    sessionId,
    userId,
    organizationId,
    [{ role: "COACH", content: replyText }],
    1
  );
  if (!updatedSession) {
    return null;
  }

  const detail = toSessionDetail(updatedSession, snippets);
  return {
    session: detail,
    reply: detail.messages[detail.messages.length - 1]
  };
}

export async function completeSession(
  sessionId: string,
  userId: string,
  organizationId: string
): Promise<SessionDetail | null> {
  const session = await completeSessionRecord(sessionId, userId, organizationId);
  if (!session) {
    return null;
  }

  return toSessionDetail(
    session,
    buildContextSnippets(session.scenario, session.documents)
  );
}

function toScenarioSummary(scenario: ScenarioRecord): ScenarioSummary {
  return {
    id: scenario.id,
    key: scenario.key,
    title: scenario.title,
    description: scenario.description,
    buyerCompany: scenario.buyerCompany,
    buyerRole: scenario.buyerRole,
    buyerTone: scenario.buyerTone,
    challenge: scenario.challenge,
    goal: scenario.goal
  };
}

function toSessionMessage(message: MessageRecord): SessionMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt
  };
}

function toSessionSummary(session: HydratedSession): SessionSummary {
  const latestMessage = session.messages[session.messages.length - 1];
  return {
    id: session.id,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    coachInterventionCount: session.coachInterventionCount,
    messageCount: session.messages.length,
    latestMessagePreview: latestMessage ? latestMessage.content.slice(0, 140) : null,
    scenario: toScenarioSummary(session.scenario)
  };
}

function toSessionDetail(
  session: HydratedSession | HydratedSessionContext,
  snippets: ReturnType<typeof buildContextSnippets>
): SessionDetail {
  const messages = session.messages.map(toSessionMessage);

  return {
    ...toSessionSummary(session),
    messages,
    contextSnippets: snippets.map((snippet) => snippet.text),
    nextRecommendedAction: getNextRecommendedAction(session.status, messages)
  };
}

export function buildContextSnippets(
  scenario: ScenarioRecord,
  documents: DocumentRecord[],
  query = ""
) {
  const knowledgeBase = [
    {
      source: scenario.title,
      text: `${scenario.description} ${scenario.challenge} ${scenario.goal}`
    },
    ...documents.flatMap((document) => {
      const chunks = chunkText(document.content ?? document.summary ?? "", 500, 80);
      return chunks.map((chunk) => ({
        source: document.title,
        text: chunk
      }));
    })
  ];

  return rankKnowledgeSnippets(
    `${scenario.title} ${scenario.challenge} ${query}`.trim(),
    knowledgeBase,
    3
  );
}

async function generateBuyerReply(
  session: HydratedSession,
  userMessage: string,
  snippets: ReturnType<typeof buildContextSnippets>
): Promise<string> {
  const fallback = buildDeterministicBuyerReply({
    scenario: toScenarioSummary(session.scenario),
    snippets,
    userMessage
  });

  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return fallback;
  }

  try {
    const transcript = session.messages
      .concat({
        id: "pending",
        role: "USER",
        content: userMessage,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        sessionId: session.id
      })
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    const prompt = [
      buildBuyerPrompt(session.scenario.buyerCompany, session.scenario.title),
      `Buyer role: ${session.scenario.buyerRole}`,
      `Buyer tone: ${session.scenario.buyerTone}`,
      `Primary challenge: ${session.scenario.challenge}`,
      `Seller goal: ${session.scenario.goal}`,
      `Relevant context:\n${snippets.map((snippet) => `- ${snippet.text}`).join("\n")}`,
      `Conversation transcript:\n${transcript}`,
      "Respond as the buyer with 2-4 sentences. Stay skeptical, concrete, and measurable."
    ].join("\n");

    const response = await openAiClient.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt
    });

    const text = (response as { output_text?: string }).output_text?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function generateCoachReply(
  session: HydratedSession,
  snippets: ReturnType<typeof buildContextSnippets>
): Promise<string> {
  const fallback = buildDeterministicCoachReply({
    scenario: toScenarioSummary(session.scenario),
    snippets,
    messages: session.messages.map(toSessionMessage)
  });

  const openAiClient = getOpenAiClient();
  if (!openAiClient) {
    return fallback;
  }

  try {
    const transcript = session.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    const prompt = [
      buildCoachPrompt(),
      `Scenario: ${session.scenario.title}`,
      `Challenge: ${session.scenario.challenge}`,
      `Goal: ${session.scenario.goal}`,
      `Relevant context:\n${snippets.map((snippet) => `- ${snippet.text}`).join("\n")}`,
      `Transcript:\n${transcript}`,
      "Return three concise coaching instructions. Focus on business framing, proof, and next question."
    ].join("\n");

    const response = await openAiClient.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt
    });

    const text = (response as { output_text?: string }).output_text?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

function getOpenAiClient(): null | OpenAI {
  if (!canUseOpenAiText()) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_API_BASE_URL
  });
}
