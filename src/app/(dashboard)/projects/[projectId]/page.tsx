import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProjectView } from "@/components/project/project-view";
import { ALL_STORY_STATUSES, COLUMN_TITLES } from "@/types";
import type { BoardColumn, StoryStatus } from "@/types";

export default async function ProjectBoardPage({
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
    include: {
      labels: true,
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!project) redirect("/dashboard");

  const stories = await prisma.story.findMany({
    where: { projectId },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
      parent: { select: { id: true, shortId: true, title: true } },
      children: { select: { id: true, shortId: true, title: true, status: true } },
      blockedByDeps: { include: { blocker: { select: { id: true, shortId: true, title: true, status: true } } } },
      blockingDeps: { include: { blocked: { select: { id: true, shortId: true, title: true, status: true } } } },
    },
    orderBy: { position: "asc" },
  });

  const columns: BoardColumn[] = ALL_STORY_STATUSES.map((status) => ({
    id: status,
    title: COLUMN_TITLES[status as StoryStatus],
    stories: stories.filter((s) => s.status === status),
  }));

  const members = project.members.map((m) => m.user);

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProjectView
      initialColumns={columns}
      projectId={projectId}
      projectName={project.name}
      labels={project.labels}
      members={members}
      techStack={project.techStack}
      sprints={sprints}
    />
  );
}
