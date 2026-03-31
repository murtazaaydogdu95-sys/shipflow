import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/lemonsqueezy";

export const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Resolve the plan-level max concurrent agents for a project's org.
 */
export async function resolveMaxAgents(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true, maxConcurrentAgents: true },
  });

  let planMax: number = PLAN_LIMITS.FREE.maxConcurrentAgents;
  if (project?.orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: project.orgId },
      select: { plan: true },
    });
    const plan = (org?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
    planMax = PLAN_LIMITS[plan]?.maxConcurrentAgents ?? PLAN_LIMITS.FREE.maxConcurrentAgents;
  }

  // Use the lower of project setting and plan limit
  const projectMax = project?.maxConcurrentAgents ?? 1;
  return Math.min(projectMax, planMax);
}

/**
 * Check if agent slots are available for this project.
 * Counts active agents (RUNNING + QUEUED) and compares to plan-aware maxConcurrentAgents.
 * REVIEW stories no longer block the queue.
 */
export async function isQueueBlocked(projectId: string): Promise<boolean> {
  const maxAgents = await resolveMaxAgents(projectId);

  const activeCount = await prisma.story.count({
    where: {
      projectId,
      agentStatus: { in: ["RUNNING", "QUEUED"] },
    },
  });
  return activeCount >= maxAgents;
}

/**
 * Atomically claim an agent slot by setting agentStatus to QUEUED only if
 * the current active agent count is below maxConcurrentAgents.
 * Returns true if the slot was successfully claimed, false otherwise.
 * This prevents the race condition where two concurrent requests both pass
 * isQueueBlocked() and exceed the limit.
 */
export async function claimAgentSlot(storyId: string, projectId: string, agentId?: string): Promise<boolean> {
  const maxAgents = await resolveMaxAgents(projectId);

  // Use a serializable transaction to atomically check count + claim slot
  try {
    await prisma.$transaction(async (tx) => {
      const activeCount = await tx.story.count({
        where: {
          projectId,
          agentStatus: { in: ["RUNNING", "QUEUED"] },
        },
      });

      if (activeCount >= maxAgents) {
        throw new Error("SLOT_FULL");
      }

      await tx.story.update({
        where: { id: storyId },
        data: {
          status: "IN_PROGRESS",
          agentStatus: "QUEUED",
          assignedToAgent: true,
          agentTriggeredAt: new Date(),
          ...(agentId ? { agentId } : {}),
        },
      });

      // Update Agent record status if agentId is provided
      if (agentId) {
        await tx.agent.update({
          where: { id: agentId },
          data: { status: "running", lastHeartbeatAt: new Date() },
        });
      }
    }, { isolationLevel: "Serializable" });

    return true;
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return false;
    }
    // Serialization failure (concurrent transaction) — treat as slot full
    console.warn(`[agent-queue] claimAgentSlot: transaction conflict for ${storyId}, treating as slot full`);
    return false;
  }
}

/**
 * Find the next eligible story to process, ordered by priority.
 * All priorities are eligible. Order: CRITICAL → HIGH → MEDIUM → LOW, then by creation date.
 */
export async function findNextStory(projectId: string) {
  const batchSize = 20;
  let skip = 0;

  while (true) {
    const stories = await prisma.story.findMany({
      where: {
        projectId,
        status: { in: ["BACKLOG", "TODO"] },
        agentStatus: null, // not already queued/running/completed
      },
      include: {
        acceptanceCriteria: { orderBy: { position: "asc" } },
        blockedByDeps: {
          include: { blocker: { select: { status: true } } },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: batchSize,
      skip,
    });

    if (stories.length === 0) {
      if (skip > 0) {
        console.log(`[agent-queue] findNextStory: all eligible stories are blocked`);
      }
      return null;
    }

    // Sort by priority mapping (DB sorts alphabetically, we need CRITICAL > HIGH > MEDIUM > LOW)
    stories.sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
    );

    // Find first unblocked story
    for (const s of stories) {
      if (!s.blockedByDeps || s.blockedByDeps.length === 0) return s;
      if (s.blockedByDeps.every((dep) => dep.blocker.status === "DONE")) return s;
    }

    // All in this batch were blocked, try next batch
    skip += batchSize;

    // Safety limit to avoid infinite loops
    if (skip > 500) {
      console.log(`[agent-queue] findNextStory: checked 500+ stories, all blocked`);
      return null;
    }
  }
}
