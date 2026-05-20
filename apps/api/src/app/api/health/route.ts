import { NextResponse } from "next/server";

import { getStorageBackend } from "@/lib/database-config";
import {
  hasOpenAiApiKey,
  isOpenAiTextEnabled,
  isVoiceLabEnabled
} from "@/lib/env";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      storageBackend: getStorageBackend(),
      openAiApiConfigured: hasOpenAiApiKey(),
      openAiTextEnabled: isOpenAiTextEnabled(),
      voiceLabEnabled: isVoiceLabEnabled()
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
