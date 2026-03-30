import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AgentDetailClient } from "@/components/agents/agent-detail-client";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; agentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { projectId, agentId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.user.id } },
    },
    select: { id: true, orgId: true },
  });

  if (!project) redirect("/dashboard");

  return (
    <div className="flex-1 p-6 space-y-6">
      <AgentDetailClient
        projectId={projectId}
        agentId={agentId}
        orgId={project.orgId ?? ""}
      />
    </div>
  );
}
