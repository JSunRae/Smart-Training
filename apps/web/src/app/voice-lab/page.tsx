import { redirect } from "next/navigation";

import { VoiceLabShell } from "@/components/voice-lab-shell";
import { readApiHealth } from "@/lib/runtime";
import { trainingEnabled } from "@/lib/site-mode";

export default async function VoiceLabPage() {
  if (!trainingEnabled()) redirect("/");
  const health = await readApiHealth();
  return <VoiceLabShell enabled={health?.voiceLabEnabled ?? false} />;
}
