import { redirect } from "next/navigation";

import { HomeShell } from "@/components/home-shell";
import { readApiHealth } from "@/lib/runtime";
import { readSiteMode, trainingEnabled } from "@/lib/site-mode";

export default async function DashboardPage() {
  if (!trainingEnabled()) redirect("/");
  const health = await readApiHealth();
  return <HomeShell initialMode="login" inviteOnly={readSiteMode() === "pilot"} voiceLabEnabled={health?.voiceLabEnabled ?? false} />;
}
