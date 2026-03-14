import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/lemonsqueezy";

type LimitResult = { allowed: true } | { allowed: false; message: string };

/**
 * Resolve the plan for a given context.
 * Prefers org plan if orgId is provided, falls back to user plan.
 */
async function resolvePlan(orgId?: string | null, userId?: string): Promise<keyof typeof PLAN_LIMITS> {
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });
    return (org?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
  }
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return (user?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
  }
  return "FREE";
}

export async function checkProjectLimit(userId: string, orgId?: string | null): Promise<LimitResult> {
  const plan = await resolvePlan(orgId, userId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  if (limits.maxProjects === Infinity) return { allowed: true };

  let count: number;
  if (orgId) {
    count = await prisma.project.count({ where: { orgId } });
  } else {
    count = await prisma.projectMember.count({ where: { userId, role: "OWNER" } });
  }

  if (count >= limits.maxProjects) {
    return {
      allowed: false,
      message: `Free plan allows up to ${limits.maxProjects} projects. Upgrade to Pro for unlimited projects.`,
    };
  }

  return { allowed: true };
}

export type RewriteLimitResult =
  | { allowed: true; used: number; limit: number; remaining: number }
  | { allowed: false; used: number; limit: number; remaining: 0; message: string };

export async function checkRewriteLimit(
  projectId: string,
  userId: string,
  hasByok: boolean
): Promise<RewriteLimitResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  const plan = await resolvePlan(project?.orgId, userId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  const limit = limits.maxAIRewritesPerDay;

  if (hasByok) {
    return { allowed: true, used: 0, limit, remaining: limit };
  }

  // Count STORY_REWRITTEN activities today across org projects
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let projectIds: string[];
  if (project?.orgId) {
    const orgProjects = await prisma.project.findMany({
      where: { orgId: project.orgId },
      select: { id: true },
    });
    projectIds = orgProjects.map((p) => p.id);
  } else {
    projectIds = [projectId];
  }

  const used = await prisma.activity.count({
    where: {
      projectId: { in: projectIds },
      type: "STORY_REWRITTEN",
      createdAt: { gte: startOfDay },
    },
  });

  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      message: `You've used all ${limit} AI rewrites for today. ${plan === "FREE" ? "Upgrade to Pro for 50/day, or add your own API key for unlimited rewrites." : "Add your own API key in Project Settings for unlimited rewrites."}`,
    };
  }

  return { allowed: true, used, limit, remaining };
}

export async function checkStoryLimit(projectId: string, userId: string): Promise<LimitResult> {
  // Try to resolve plan via the project's org first
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  const plan = await resolvePlan(project?.orgId, userId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  if (limits.maxStoriesPerProject === Infinity) return { allowed: true };

  const count = await prisma.story.count({ where: { projectId } });

  if (count >= limits.maxStoriesPerProject) {
    return {
      allowed: false,
      message: `Free plan allows up to ${limits.maxStoriesPerProject} stories per project. Upgrade to Pro for unlimited stories.`,
    };
  }

  return { allowed: true };
}
