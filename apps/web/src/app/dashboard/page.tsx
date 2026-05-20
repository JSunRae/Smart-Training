import { HomeShell } from "@/components/home-shell";
import { readApiHealth } from "@/lib/runtime";

export default async function DashboardPage() {
  const health = await readApiHealth();
  return <HomeShell initialMode="login" voiceLabEnabled={health?.voiceLabEnabled ?? false} />;
}
