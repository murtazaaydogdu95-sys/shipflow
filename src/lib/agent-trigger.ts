import { spawn } from "child_process";
import { execSync } from "child_process";
import { writeFileSync, openSync, appendFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { prisma } from "@/lib/prisma";

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
 * Check if an agent is busy or a story is awaiting review approval.
 * Queue is blocked while any story is RUNNING, QUEUED, or sitting in REVIEW.
 */
async function isQueueBlocked(projectId: string): Promise<boolean> {
  const blocked = await prisma.story.findFirst({
    where: {
      projectId,
      OR: [
        { agentStatus: { in: ["RUNNING", "QUEUED"] } },
        { status: "REVIEW", agentStatus: "COMPLETED" },
      ],
    },
  });
  return !!blocked;
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
    },
    orderBy: { createdAt: "asc" },
  });

  if (stories.length === 0) return null;

  // Sort by priority (CRITICAL first), then by creation date
  stories.sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );

  return stories[0];
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

  // Only one agent at a time — also wait for REVIEW approval before starting next
  if (await isQueueBlocked(projectId)) {
    console.log(`[agent-trigger] processNextStory: queue blocked (agent running or story in review)`);
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
      execSync(`git checkout ${story.branchName}`, opts);
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
    execSync("git checkout main", opts);
    execSync("git pull origin main", opts);
  } catch {
    // If pull fails (no remote, etc.), just stay on main
    console.warn("[agent-trigger] git pull failed, continuing on current main");
  }

  execSync(`git checkout -b ${branchName}`, opts);

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

  // Create or checkout feature branch
  const branchName = await ensureBranch(story, project.agentWorkingDir);

  // Mark as QUEUED
  await prisma.story.update({
    where: { id: storyId },
    data: {
      agentStatus: "QUEUED",
      assignedToAgent: true,
      agentTriggeredAt: new Date(),
    },
  });

  // Build MCP config
  const configPath = `/tmp/shipflow-mcp-${storyId}.json`;
  const mcpConfig = {
    mcpServers: {
      shipflow: {
        command: "node",
        args: [path.resolve(process.cwd(), "packages/mcp-server/dist/index.js")],
        env: {
          SHIPFLOW_API_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
          SHIPFLOW_API_KEY: project.apiKey,
          SHIPFLOW_PROJECT_ID: projectId,
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
  const logPath = `/tmp/shipflow-agent-${storyId}.log`;
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
