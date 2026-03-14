import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayView } from "@/components/today/today-view";

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Get user's current org
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentOrgId: true },
  });

  // Get all active stories assigned to or created by the user
  const stories = await prisma.story.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
      project: user?.currentOrgId ? { orgId: user.currentOrgId } : { members: { some: { userId } } },
    },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
      project: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  // Priority sort: CRITICAL first
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  stories.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  // Recently completed (last 7 days)
  const recentlyDone = await prisma.story.findMany({
    where: {
      status: "DONE",
      updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      project: user?.currentOrgId ? { orgId: user.currentOrgId } : { members: { some: { userId } } },
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return <TodayView stories={stories} recentlyDone={recentlyDone} />;
}
