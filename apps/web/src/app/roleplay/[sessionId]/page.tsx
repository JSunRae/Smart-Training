import { SessionShell } from "@/components/session-shell";

type RoleplayPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function SessionPage({ params }: RoleplayPageProps) {
  const { sessionId } = await params;
  return <SessionShell sessionId={sessionId} />;
}
