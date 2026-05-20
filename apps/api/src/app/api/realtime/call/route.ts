import type { RealtimeCallRequest, RealtimeCallResponse } from "@core/contracts";

import { requireSessionUser } from "@/lib/auth";
import { jsonError, jsonResponse, readJson } from "@/lib/http";
import { getScenarioContext } from "@/lib/repository";
import {
  buildRealtimeBuyerInstructions,
  createOpenAiSafetyIdentifier,
  getRealtimeVoiceModel,
  getRealtimeVoiceName,
  isRealtimeVoiceEnabled,
  isRealtimeVoiceConfigured
} from "@/lib/realtime";
import { ensureSeedData } from "@/lib/seed";
import type { DocumentRecord, ScenarioRecord } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireSessionUser(request);
  if (!user) {
    return jsonError("Not authenticated.", 401);
  }

  if (!isRealtimeVoiceEnabled()) {
    return jsonError("Voice lab is disabled for this deployment.", 403);
  }

  if (!isRealtimeVoiceConfigured()) {
    return jsonError(
      "Realtime voice is unavailable. Configure OPENAI_API_KEY before using the voice lab.",
      503
    );
  }

  const body = await readJson<RealtimeCallRequest>(request);
  if (!body?.scenarioId || !body?.sdp?.trim()) {
    return jsonError("Scenario ID and SDP offer are required.");
  }

  await ensureSeedData();

  const scenarioContext = await getScenarioContext(body.scenarioId, user.organizationId);
  if (!scenarioContext) {
    return jsonError("Scenario not found.", 404);
  }

  const realtimeResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`,
      "OpenAI-Safety-Identifier": createOpenAiSafetyIdentifier(user.id, user.organizationId)
    },
    body: buildRealtimeFormData(body.sdp, scenarioContext.scenario, scenarioContext.documents)
  });

  const raw = await realtimeResponse.text();
  if (!realtimeResponse.ok) {
    return jsonError(readRealtimeError(raw), realtimeResponse.status);
  }

  const response: RealtimeCallResponse = {
    answerSdp: raw,
    callId: readCallId(realtimeResponse.headers.get("Location"))
  };

  return jsonResponse(response, 201);
}

function buildRealtimeFormData(
  sdp: string,
  scenario: ScenarioRecord,
  documents: DocumentRecord[]
) {
  const formData = new FormData();
  const { instructions } = buildRealtimeBuyerInstructions(scenario, documents);
  formData.set("sdp", sdp);
  formData.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: getRealtimeVoiceModel(),
      instructions,
      audio: {
        input: {
          turn_detection: {
            type: "server_vad"
          }
        },
        output: {
          voice: getRealtimeVoiceName()
        }
      }
    })
  );

  return formData;
}

function readCallId(locationHeader: null | string): null | string {
  if (!locationHeader) {
    return null;
  }

  const parts = locationHeader.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : null;
}

function readRealtimeError(raw: string): string {
  if (!raw.trim()) {
    return "OpenAI Realtime returned an empty error response.";
  }

  try {
    const data = JSON.parse(raw) as { error?: { message?: string } | string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (data.error && typeof data.error === "object" && typeof data.error.message === "string") {
      return data.error.message;
    }
  } catch {
    return raw;
  }

  return raw;
}
