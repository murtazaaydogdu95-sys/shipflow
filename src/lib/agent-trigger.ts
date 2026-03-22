import { spawn, execSync, execFileSync } from "child_process";
import { writeFileSync, openSync, appendFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/paddle";

export const AGENT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Lazily resolve the claude binary path. Cached after first successful resolution.
 */
let _claudeBin: string | null = null;
function getClaudeBin(): string {
  if (_claudeBin) return _claudeBin;

  const home = homedir();
  const candidates = [
    path.join(home, ".local", "bin", "claude"),
    path.join(home, ".claude", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ];

  // Check known paths first
  for (const p of candidates) {
    try {
      execSync(`test -x "${p}"`, { stdio: "ignore" });
      _claudeBin = p;
      console.log(`[agent-trigger] claude binary found at: ${p}`);
      return p;
    } catch {
      // try next
    }
  }

  // Fall back to which
  try {
    _claudeBin = execSync("which claude", { encoding: "utf-8" }).trim();
    console.log(`[agent-trigger] claude binary resolved via which: ${_claudeBin}`);
    return _claudeBin;
  } catch {
    // last resort
  }

  console.warn("[agent-trigger] claude binary not found, using bare 'claude'");
  _claudeBin = "claude";
  return _claudeBin;
}

interface TriggerOptions {
  storyId: string;
  projectId: string;
  force?: boolean;
  feedback?: string;
}

/**
 * Resolve the plan-level max concurrent agents for a project's org.
 */
async function resolveMaxAgents(projectId: string): Promise<number> {
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
async function isQueueBlocked(projectId: string): Promise<boolean> {
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
async function claimAgentSlot(storyId: string, projectId: string): Promise<boolean> {
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
          agentStatus: "QUEUED",
          assignedToAgent: true,
          agentTriggeredAt: new Date(),
        },
      });
    }, { isolationLevel: "Serializable" });

    return true;
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_FULL") {
      return false;
    }
    // Serialization failure (concurrent transaction) — treat as slot full
    console.warn(`[agent-trigger] claimAgentSlot: transaction conflict for ${storyId}, treating as slot full`);
    return false;
  }
}

/**
 * Find the next eligible story to process, ordered by priority.
 * All priorities are eligible. Order: CRITICAL → HIGH → MEDIUM → LOW, then by creation date.
 */
async function findNextStory(projectId: string) {
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
    orderBy: { createdAt: "asc" },
  });

  if (stories.length === 0) return null;

  // Filter out blocked stories (stories with unresolved blockers)
  const unblocked = stories.filter((s) => {
    if (!s.blockedByDeps || s.blockedByDeps.length === 0) return true;
    return s.blockedByDeps.every((dep) => dep.blocker.status === "DONE");
  });

  if (unblocked.length === 0) {
    console.log(`[agent-trigger] findNextStory: all eligible stories are blocked`);
    return null;
  }

  // Sort by priority (CRITICAL first), then by creation date
  unblocked.sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );

  // PRO_MAX priority queue: if enabled, always pick the highest priority story
  // (already sorted by priority above, so the first element is highest priority)
  // For non-priority-queue plans, behavior is the same — priority then creation date
  return unblocked[0];
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

  await spawnAgent({ storyId: story.id, projectId });

  // Check if more agent slots are available and fill them
  if (!(await isQueueBlocked(projectId))) {
    // Small delay to prevent tight loops
    setTimeout(() => processNextStory(projectId).catch(console.error), 1000);
  }
}

/**
 * Trigger agent for a specific story. Used for manual triggers and re-triggers with feedback.
 */
export async function triggerClaudeAgent({ storyId, projectId, force, feedback }: TriggerOptions) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      agentAutoAssign: true,
      agentMinPriority: true,
      agentWorkingDir: true,
      apiKey: true,
    },
  });

  if (!project) return;
  if (!force && !project.agentAutoAssign) return;
  if (!project.apiKey || !project.agentWorkingDir) return;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story) return;
  if (story.agentStatus === "RUNNING") return;

  await spawnAgent({ storyId, projectId, feedback });
}

const BRANCH_PREFIX: Record<string, string> = {
  feature: "feat",
  bug: "bug",
  chore: "chore",
  refactor: "refactor",
  docs: "docs",
  test: "test",
};

/**
 * Create or checkout a branch for the story.
 * Uses the story type to determine the branch prefix.
 * Returns the branch name.
 */
async function ensureBranch(story: { id: string; shortId: string; title: string; type: string; branchName: string | null }, cwd: string): Promise<string> {
  const opts = { cwd, encoding: "utf-8" as const, timeout: 15000 };

  if (story.branchName) {
    // Re-trigger: checkout existing branch
    try {
      execFileSync("git", ["checkout", story.branchName], opts);
    } catch {
      // Branch might already be checked out
    }
    console.log(`[agent-trigger] checked out existing branch: ${story.branchName}`);
    return story.branchName;
  }

  // Create new branch from main
  const slug = story.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const prefix = BRANCH_PREFIX[story.type] || "feat";
  const branchName = `${prefix}/${story.shortId}-${slug}`;

  try {
    execFileSync("git", ["checkout", "main"], opts);
    execFileSync("git", ["pull", "origin", "main"], opts);
  } catch {
    // If pull fails (no remote, etc.), just stay on main
    console.warn("[agent-trigger] git pull failed, continuing on current main");
  }

  execFileSync("git", ["checkout", "-b", branchName], opts);

  // Store branch name on story
  await prisma.story.update({
    where: { id: story.id },
    data: { branchName },
  });

  console.log(`[agent-trigger] created branch: ${branchName}`);
  return branchName;
}

/**
 * Core function: spawn a detached Claude process for a story.
 */
async function spawnAgent({ storyId, projectId, feedback }: { storyId: string; projectId: string; feedback?: string }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true, apiKey: true },
  });

  if (!project?.apiKey || !project.agentWorkingDir) return;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { acceptanceCriteria: { orderBy: { position: "asc" } } },
  });

  if (!story) return;

  // Atomically claim an agent slot before doing any work
  const claimed = await claimAgentSlot(storyId, projectId);
  if (!claimed) {
    console.log(`[agent-trigger] spawnAgent: no agent slot available for ${story.shortId}`);
    return;
  }

  // Create or checkout feature branch
  const branchName = await ensureBranch(story, project.agentWorkingDir);

  // Build MCP config
  const configPath = `/tmp/codepylot-mcp-${storyId}.json`;
  const mcpConfig = {
    mcpServers: {
      codepylot: {
        command: "node",
        args: [path.resolve(process.cwd(), "packages/mcp-server/dist/index.js")],
        env: {
          CODEPYLOT_API_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
          CODEPYLOT_API_KEY: project.apiKey,
          CODEPYLOT_PROJECT_ID: projectId,
        },
      },
    },
  };

  writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2));

  // Build prompt
  const acList = story.acceptanceCriteria
    .map((ac) => `  - Given ${ac.given}, When ${ac.when}, Then ${ac.then}`)
    .join("\n");

  const promptParts = [
    `You are working on story ${story.shortId}: "${story.title}"`,
    `\nStory ID (use this for all MCP tool calls): ${story.id}`,
    story.description ? `\nDescription: ${story.description}` : "",
    story.userStory ? `\nUser Story: ${story.userStory}` : "",
    acList ? `\nAcceptance Criteria:\n${acList}` : "",
    `\nPriority: ${story.priority}`,
  ];

  if (feedback) {
    promptParts.push(
      `\n⚠️ REVIEW FEEDBACK — The user reviewed your previous work and requested changes:`,
      `"${feedback}"`,
      `\nFix the issues described above. Do not start from scratch — only address the feedback.`,
    );
  }

  promptParts.push(
    `\nInstructions:`,
    `1. First call update_story_status with storyId "${story.id}" to move the story to IN_PROGRESS`,
    `2. ${feedback ? "Fix the issues described in the review feedback" : "Implement the feature/fix described above"}`,
    `3. When done, call complete_story with storyId "${story.id}", a summary and commit hash — this moves the story to REVIEW for the user to approve`,
    `4. Do NOT move the story to DONE — the user will review and approve it`,
    `5. If you get stuck, call add_note with progress details`,
  );

  const prompt = promptParts.join("\n");

  // Resolve claude binary lazily
  const claudeBin = getClaudeBin();

  // Build PATH that includes common install locations
  const home = homedir();
  const extraPath = [
    path.join(home, ".local", "bin"),
    path.join(home, ".claude", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
  ].join(":");
  const fullPath = `${process.env.PATH || ""}:${extraPath}`;

  // Spawn detached claude process with output logging
  const logPath = `/tmp/codepylot-agent-${storyId}.log`;
  const logFd = openSync(logPath, "w");

  console.log(`[agent-trigger] spawning: ${claudeBin} for ${story.shortId} in ${project.agentWorkingDir}`);

  const child = spawn(claudeBin, ["--print", "--dangerously-skip-permissions", "--mcp-config", configPath, "-p", prompt], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    cwd: project.agentWorkingDir,
    env: { ...process.env, PATH: fullPath },
  });

  child.unref();

  // On exit: if success + REVIEW, auto-start preview; on failure mark FAILED
  child.on("exit", async (code) => {
    console.log(`[agent-trigger] agent exited for ${story.shortId} with code ${code}`);
    if (code !== 0) {
      try {
        await prisma.story.update({
          where: { id: storyId },
          data: { agentStatus: "FAILED" },
        });
      } catch (err) {
        console.error(`[agent-trigger] failed to update status for ${storyId}:`, err);
      }
    } else {
      // Check if story moved to REVIEW (agent called complete_story)
      try {
        const latest = await prisma.story.findUnique({ where: { id: storyId } });
        if (latest && latest.status === "REVIEW" && latest.agentStatus === "COMPLETED") {
          const { startPreview } = await import("@/lib/preview-manager");
          await startPreview(storyId, projectId);

          // Auto-trigger AI code review
          try {
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const proj = await prisma.project.findUnique({
              where: { id: projectId },
              select: { apiKey: true },
            });
            if (proj?.apiKey) {
              fetch(`${baseUrl}/api/projects/${projectId}/stories/${storyId}/review`, {
                method: "POST",
                headers: { Authorization: `Bearer ${proj.apiKey}` },
              }).catch(console.error);
            }
          } catch (reviewErr) {
            console.error(`[agent-trigger] auto-review failed for ${storyId}:`, reviewErr);
          }
        }
      } catch (err) {
        console.error(`[agent-trigger] failed to start preview for ${storyId}:`, err);
      }
    }
    // Whether success or failure, check if there's another story to process
    processNextStory(projectId).catch(console.error);
  });

  child.on("error", async (err) => {
    console.error(`[agent-trigger] spawn error for ${story.shortId}:`, err.message);
    appendFileSync(logPath, `\nSPAWN ERROR: ${err.message}\n`);
    try {
      await prisma.story.update({
        where: { id: storyId },
        data: { agentStatus: "FAILED" },
      });
    } catch (e) {
      console.error(`[agent-trigger] failed to update status for ${storyId}:`, e);
    }
    processNextStory(projectId).catch(console.error);
  });

  // Mark as RUNNING
  await prisma.story.update({
    where: { id: storyId },
    data: { agentStatus: "RUNNING" },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      type: "AGENT_TRIGGERED",
      message: `Claude agent triggered for story: ${story.title} (branch: ${branchName})`,
      projectId,
      storyId,
    },
  });
}
