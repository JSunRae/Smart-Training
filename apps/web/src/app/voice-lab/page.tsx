import { VoiceLabShell } from "@/components/voice-lab-shell";
import { readApiHealth } from "@/lib/runtime";

export default async function VoiceLabPage() {
  const health = await readApiHealth();
  return <VoiceLabShell enabled={health?.voiceLabEnabled ?? false} />;
}
