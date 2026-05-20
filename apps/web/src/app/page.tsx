import { HomeShell } from "@/components/home-shell";
import { readApiHealth } from "@/lib/runtime";

export default async function Home() {
  const health = await readApiHealth();
  return <HomeShell initialMode="register" voiceLabEnabled={health?.voiceLabEnabled ?? false} />;
}
