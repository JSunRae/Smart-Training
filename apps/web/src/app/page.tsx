import type { Metadata } from "next";

import { HomeShell } from "@/components/home-shell";
import { MarketingHome } from "@/components/marketing-home";
import { readApiHealth } from "@/lib/runtime";
import { readSiteMode } from "@/lib/site-mode";

export const metadata: Metadata =
  readSiteMode() === "workspace"
    ? {}
    : {
        alternates: { canonical: "https://training.jasonrae.ai" },
        openGraph: {
          title: "Smart Training | Sales conversation practice",
          description:
            "Practise the conversation. Prepare for the real one. Sales conversation practice by JasonRAE.AI.",
          url: "https://training.jasonrae.ai",
          siteName: "Smart Training",
          type: "website"
        },
        twitter: {
          card: "summary",
          title: "Smart Training | Sales conversation practice",
          description: "Practise the conversation. Prepare for the real one."
        }
      };

export default async function Home() {
  const mode = readSiteMode();
  if (mode !== "workspace") return <MarketingHome pilotEnabled={mode === "pilot"} />;
  const health = await readApiHealth();
  return <HomeShell initialMode="register" voiceLabEnabled={health?.voiceLabEnabled ?? false} />;
}
