import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AgentListClient } from "@/components/agents/agent-list-client";

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;

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
      <div>
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your AI coding agents
        </p>
      </div>
      <AgentListClient orgId={project.orgId ?? ""} projectId={projectId} />
    </div>
  );
}
