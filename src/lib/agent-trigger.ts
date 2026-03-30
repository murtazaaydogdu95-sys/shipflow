import { prisma } from "@/lib/prisma";
import { isQueueBlocked, findNextStory } from "@/lib/agent-queue";
import { spawnAgent, AGENT_TIMEOUT_MS } from "@/lib/agent-executor";
import { checkBudget } from "@/lib/budget-check";

// Re-export for backward compatibility (used by agent-cleanup cron)
export { AGENT_TIMEOUT_MS };

interface TriggerOptions {
  storyId: string;
  projectId: string;
  agentId?: string;
  force?: boolean;
  feedback?: string;
}

/**
 * Process the next story in the queue for a project.
 * Called after story creation, or after a story finishes (approve/reject).
 * Uses a small delay to ensure DB writes are visible.
 */
export async function processNextStory(projectId: string) {
  // Small delay to ensure the triggering DB write is committed and visible
  await new Promise((r) => setTimeout(r, 500));

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      agentAutoAssign: true,
      agentMinPriority: true,
      agentWorkingDir: true,
      apiKey: true,
    },
  });

  if (!project || !project.agentAutoAssign) {
    console.log(`[agent-trigger] processNextStory: auto-assign disabled or project not found`);
    return;
  }
  if (!project.apiKey || !project.agentWorkingDir) {
    console.log(`[agent-trigger] processNextStory: missing apiKey or workingDir`);
    return;
  }

  if (await isQueueBlocked(projectId)) {
    console.log(`[agent-trigger] processNextStory: all agent slots full`);
    return;
  }

  const story = await findNextStory(projectId);
  if (!story) {
    console.log(`[agent-trigger] processNextStory: no eligible stories found`);
    return;
  }

  console.log(`[agent-trigger] processNextStory: picked ${story.shortId} (${story.priority}) — spawning agent`);

  // Move to TODO if in BACKLOG
  if (story.status === "BACKLOG") {
    await prisma.story.update({
      where: { id: story.id },
      data: { status: "TODO" },
    });
    await prisma.activity.create({
      data: {
        type: "STORY_MOVED",
        message: `Auto-moved from BACKLOG to TODO (agent queue)`,
        projectId,
        storyId: story.id,
      },
    });
  }

  // Select an idle agent for this project's org (round-robin by least stories completed)
  const proj = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });
  let idleAgentId: string | undefined;
  if (proj?.orgId) {
    const idleAgent = await prisma.agent.findFirst({
      where: { orgId: proj.orgId, status: "idle" },
      orderBy: { storiesCompleted: "asc" },
      select: { id: true },
    });
    idleAgentId = idleAgent?.id;
  }

  // Budget gate: check before spawning
  if (proj?.orgId && idleAgentId) {
    const budgetResult = await checkBudget(idleAgentId, projectId, proj.orgId);
    if (!budgetResult.allowed) {
      console.log(`[agent-trigger] processNextStory: budget blocked — ${budgetResult.reason}`);
      return;
    }
    if (budgetResult.warnings.length > 0) {
      console.log(`[agent-trigger] budget warnings: ${budgetResult.warnings.join("; ")}`);
    }
  }

  await spawnAgent({
    storyId: story.id,
    projectId,
    agentId: idleAgentId,
    onComplete: (pid) => processNextStory(pid).catch(console.error),
  });

  // Check if more agent slots are available and fill them
  if (!(await isQueueBlocked(projectId))) {
    // Small delay to prevent tight loops
    setTimeout(() => processNextStory(projectId).catch(console.error), 1000);
  }
}

/**
 * Trigger agent for a specific story. Used for manual triggers and re-triggers with feedback.
 */
export type TriggerResult =
  | { triggered: true }
  | { triggered: false; reason: string };

export async function triggerClaudeAgent({ storyId, projectId, agentId, force, feedback }: TriggerOptions): Promise<TriggerResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      agentAutoAssign: true,
      agentMinPriority: true,
      agentWorkingDir: true,
      apiKey: true,
    },
  });

  if (!project) return { triggered: false, reason: "Project not found" };
  if (!force && !project.agentAutoAssign) return { triggered: false, reason: "Agent auto-assign is disabled. Enable it in Project Settings." };
  if (!project.apiKey) return { triggered: false, reason: "No API key configured. Generate one in Project Settings → Claude Code Integration." };
  if (!project.agentWorkingDir) return { triggered: false, reason: "No working directory configured. Set it in Project Settings → Agent Automation." };

  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) return { triggered: false, reason: "Story not found" };
  if (story.agentStatus === "RUNNING") return { triggered: false, reason: "Agent is already running on this story" };

  // Budget gate: check before spawning
  const proj = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });
  if (proj?.orgId && agentId) {
    const budgetResult = await checkBudget(agentId, projectId, proj.orgId);
    if (!budgetResult.allowed) {
      return { triggered: false, reason: budgetResult.reason ?? "Budget exceeded" };
    }
  }

  await spawnAgent({
    storyId,
    projectId,
    agentId,
    feedback,
    onComplete: (pid) => processNextStory(pid).catch(console.error),
  });

  return { triggered: true };
}
