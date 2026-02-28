import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { KanbanBoard } from "@/components/board/kanban-board";
import { STORY_STATUSES, COLUMN_TITLES } from "@/types";
import type { BoardColumn } from "@/types";

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
    include: { labels: true },
  });

  if (!project) redirect("/");

  const stories = await prisma.story.findMany({
    where: { projectId },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });

  const columns: BoardColumn[] = STORY_STATUSES.map((status) => ({
    id: status,
    title: COLUMN_TITLES[status],
    stories: stories.filter((s) => s.status === status),
  }));

  return (
    <KanbanBoard
      initialColumns={columns}
      projectId={projectId}
      labels={project.labels}
      techStack={project.techStack}
    />
  );
}
