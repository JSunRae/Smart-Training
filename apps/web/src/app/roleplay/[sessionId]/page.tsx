import { redirect } from "next/navigation";

import { SessionShell } from "@/components/session-shell";
import { trainingEnabled } from "@/lib/site-mode";

type RoleplayPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: RoleplayPageProps) {
  if (!trainingEnabled()) redirect("/");
  const { sessionId } = await params;
  return <SessionShell key={sessionId} sessionId={sessionId} />;
}
