import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SprintManager } from "@/components/sprints/sprint-manager";

export default async function SprintsPage({
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
  });
  if (!project) redirect("/");

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: {
      _count: { select: { stories: true } },
      stories: {
        select: { storyPoints: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const backlogStories = await prisma.story.findMany({
    where: { projectId, sprintId: null },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: true,
    },
    orderBy: { position: "asc" },
  });

  return (
    <div className="flex-1 p-6">
      <SprintManager
        sprints={sprints}
        backlogStories={backlogStories}
        projectId={projectId}
      />
    </div>
  );
}
