import { redirect } from "next/navigation";

import { HomeShell } from "@/components/home-shell";
import { readApiHealth } from "@/lib/runtime";
import { readSiteMode, trainingEnabled } from "@/lib/site-mode";

export default async function StartPage() {
  if (!trainingEnabled()) redirect("/");
  const health = await readApiHealth();
  return <HomeShell initialMode="register" inviteOnly={readSiteMode() === "pilot"} voiceLabEnabled={health?.voiceLabEnabled ?? false} />;
}
