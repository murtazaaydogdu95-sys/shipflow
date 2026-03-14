import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/lemonsqueezy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });

  const plan = (org?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  // Count projects
  const projectCount = await prisma.project.count({ where: { orgId } });

  // Count stories across all org projects
  const projects = await prisma.project.findMany({
    where: { orgId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  const storyCount = projectIds.length > 0
    ? await prisma.story.count({ where: { projectId: { in: projectIds } } })
    : 0;

  // Count members
  const memberCount = await prisma.orgMember.count({ where: { orgId } });

  // Count AI rewrites today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const aiRewriteCount = projectIds.length > 0
    ? await prisma.activity.count({
        where: {
          projectId: { in: projectIds },
          type: "STORY_REWRITTEN",
          createdAt: { gte: startOfDay },
        },
      })
    : 0;

  return NextResponse.json({
    plan,
    projects: {
      used: projectCount,
      limit: limits.maxProjects === Infinity ? null : limits.maxProjects,
    },
    stories: {
      used: storyCount,
      limit: limits.maxStoriesPerProject === Infinity ? null : limits.maxStoriesPerProject,
      note: limits.maxStoriesPerProject !== Infinity ? "per project" : undefined,
    },
    members: { count: memberCount },
    aiRewrites: {
      used: aiRewriteCount,
      limit: limits.maxAIRewritesPerDay,
      period: "today",
    },
  });
}
