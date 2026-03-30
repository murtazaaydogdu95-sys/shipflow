import { spawn, execFileSync } from "child_process";
import { writeFileSync, openSync, appendFileSync, accessSync, constants } from "fs";
import { homedir } from "os";
import path from "path";
import { prisma } from "@/lib/prisma";
import { claimAgentSlot } from "@/lib/agent-queue";
import { getGoalContext } from "@/lib/goals";

export const AGENT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const BRANCH_PREFIX: Record<string, string> = {
  feature: "feat",
  bug: "bug",
  chore: "chore",
  refactor: "refactor",
  docs: "docs",
  test: "test",
};

/**
 * Lazily resolve the git binary path. The Next.js server process may not have
 * git on its PATH (especially on Vercel or inside Docker), so we probe known
 * install locations first, then fall back to `which`.
 */
let _gitBin: string | null = null;
export function getGitBin(): string {
  if (_gitBin) return _gitBin;

  const candidates = [
    "/usr/bin/git",
    "/usr/local/bin/git",
    "/opt/homebrew/bin/git",
    path.join(homedir(), ".local", "bin", "git"),
  ];

  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK);
      _gitBin = p;
      return p;
    } catch {
      // try next
    }
  }

  // Fall back to which
  try {
    _gitBin = execFileSync("/usr/bin/which", ["git"], { encoding: "utf-8" }).trim();
    return _gitBin;
  } catch {
    // last resort
  }

  _gitBin = "git";
  return _gitBin;
}

/**
 * Lazily resolve the claude binary path. Cached after first successful resolution.
 */
let _claudeBin: string | null = null;
export function getClaudeBin(): string {
  if (_claudeBin) return _claudeBin;

  const home = homedir();
  const candidates = [
    path.join(home, ".local", "bin", "claude"),
    path.join(home, ".claude", "bin", "claude"),
    "/usr/local/bin/claude",
    "/opt/homebrew/bin/claude",
  ];

  // Check known paths first using fs.accessSync (no shell needed)
  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK);
      _claudeBin = p;
      console.log(`[agent-executor] claude binary found at: ${p}`);
      return p;
    } catch {
      // try next
    }
  }

  // Fall back to which using execFileSync (array args, no shell injection)
  try {
    _claudeBin = execFileSync("which", ["claude"], { encoding: "utf-8" }).trim();
    console.log(`[agent-executor] claude binary resolved via which: ${_claudeBin}`);
    return _claudeBin;
  } catch {
    // last resort
  }

  console.warn("[agent-executor] claude binary not found, using bare 'claude'");
  _claudeBin = "claude";
  return _claudeBin;
}

/**
 * Create or checkout a branch for the story.
 * Uses the story type to determine the branch prefix.
 * Returns the branch name.
 */
export async function ensureBranch(
  story: { id: string; shortId: string; title: string; type: string; branchName: string | null },
  cwd: string
): Promise<string> {
  const opts = { cwd, encoding: "utf-8" as const, timeout: 15000 };

  if (story.branchName) {
    // Re-trigger: checkout existing branch
    try {
      execFileSync(getGitBin(), ["checkout", story.branchName], opts);
    } catch {
      // Branch might already be checked out
    }
    console.log(`[agent-executor] checked out existing branch: ${story.branchName}`);
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
    execFileSync(getGitBin(), ["checkout", "main"], opts);
    execFileSync(getGitBin(), ["pull", "origin", "main"], opts);
  } catch {
    // If pull fails (no remote, etc.), just stay on main
    console.warn("[agent-executor] git pull failed, continuing on current main");
  }

  execFileSync(getGitBin(), ["checkout", "-b", branchName], opts);

  // Store branch name on story
  await prisma.story.update({
    where: { id: story.id },
    data: { branchName },
  });

  console.log(`[agent-executor] created branch: ${branchName}`);
  return branchName;
}

interface SpawnOptions {
  storyId: string;
  projectId: string;
  agentId?: string;
  feedback?: string;
  /** Called when the agent process exits (success or failure). Used to trigger queue processing. */
  onComplete?: (projectId: string) => void;
}

/**
 * Core function: spawn a detached Claude process for a story.
 */
export async function spawnAgent({ storyId, projectId, agentId, feedback, onComplete }: SpawnOptions) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true, apiKey: true, orgId: true },
  });

  if (!project?.apiKey) return;

  // Resolve working directory: prefer ExecutionWorkspace over project.agentWorkingDir
  let workingDir = project.agentWorkingDir;
  if (agentId && project.orgId) {
    const workspace = await prisma.executionWorkspace.findFirst({
      where: { projectId, agentId, status: "active" },
      select: { workingDir: true },
    });
    if (workspace) {
      workingDir = workspace.workingDir;
    }
  }

  if (!workingDir) return;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { acceptanceCriteria: { orderBy: { position: "asc" } } },
  });

  if (!story) return;

  // Load Agent record if agentId is provided
  let agentRecord: { id: string; adapterConfig: unknown } | null = null;
  if (agentId) {
    agentRecord = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, adapterConfig: true },
    });
  }

  // Atomically claim an agent slot before doing any work
  // This also moves the story to IN_PROGRESS so the board reflects agent assignment immediately.
  const claimed = await claimAgentSlot(storyId, projectId, agentId);
  if (!claimed) {
    console.log(`[agent-executor] spawnAgent: no agent slot available for ${story.shortId}`);
    return;
  }

  // Log the status transition caused by slot claim
  await prisma.activity.create({
    data: {
      type: "STORY_MOVED",
      message: `Moved to IN_PROGRESS (agent assigned)`,
      projectId,
      storyId,
    },
  });

  // Everything after slot claim is wrapped in try/catch so failures
  // revert the story instead of leaving it stuck in IN_PROGRESS.
  let branchName: string;
  try {
    branchName = await ensureBranch(story, workingDir);
  } catch (err) {
    console.error(`[agent-executor] ensureBranch failed for ${story.shortId}:`, err);
    await prisma.story.update({
      where: { id: storyId },
      data: { status: "TODO", agentStatus: "FAILED", assignedToAgent: false },
    });
    return;
  }

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

  // Query past rejection feedback for this project (agent learning)
  let pastFeedback = "";
  try {
    const recentRejections = await prisma.activity.findMany({
      where: {
        projectId,
        type: "STORY_MOVED",
        message: { contains: "Review feedback:" },
      },
      select: { message: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (recentRejections.length > 0) {
      const patterns = recentRejections
        .map((r, i) => `  ${i + 1}. ${r.message.replace("Review feedback: ", "")}`)
        .join("\n");
      pastFeedback = `\n📋 PAST REVIEW PATTERNS — The user has previously requested these changes on other stories in this project. Proactively address them:\n${patterns}`;
    }
  } catch {
    // Non-critical — continue without past feedback
  }

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
    pastFeedback,
  ];

  // Add goal context if story is linked to a goal
  try {
    const goalContext = await getGoalContext(storyId);
    if (goalContext) {
      promptParts.push(goalContext);
    }
  } catch {
    // Non-critical — continue without goal context
  }

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
  let logFd: number;
  try {
    logFd = openSync(logPath, "w");
  } catch (err) {
    console.error(`[agent-executor] failed to open log file for ${story.shortId}:`, err);
    await prisma.story.update({
      where: { id: storyId },
      data: { status: "TODO", agentStatus: "FAILED", assignedToAgent: false },
    });
    return;
  }

  console.log(`[agent-executor] spawning: ${claudeBin} for ${story.shortId} in ${workingDir}`);

  let child;
  try {
    child = spawn(claudeBin, ["--print", "--dangerously-skip-permissions", "--mcp-config", configPath, "-p", prompt], {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: workingDir,
      env: { ...process.env, PATH: fullPath },
    });
  } catch (err) {
    console.error(`[agent-executor] spawn() threw for ${story.shortId}:`, err);
    await prisma.story.update({
      where: { id: storyId },
      data: { status: "TODO", agentStatus: "FAILED", assignedToAgent: false },
    });
    return;
  }

  child.unref();

  // Update Agent status to running and set heartbeat
  if (agentRecord) {
    await prisma.agent.update({
      where: { id: agentRecord.id },
      data: { status: "running", lastHeartbeatAt: new Date() },
    }).catch((err) => console.error(`[agent-executor] failed to update agent status:`, err));
  }

  // On exit: if success + REVIEW, auto-start preview; on failure mark FAILED
  child.on("exit", async (code) => {
    console.log(`[agent-executor] agent exited for ${story.shortId} with code ${code}`);

    // Reset Agent status back to idle on any exit
    if (agentRecord) {
      try {
        const updateData: Record<string, unknown> = { status: "idle" };
        if (code === 0) {
          updateData.storiesCompleted = { increment: 1 };
        }
        await prisma.agent.update({
          where: { id: agentRecord.id },
          data: updateData,
        });
      } catch (err) {
        console.error(`[agent-executor] failed to reset agent status:`, err);
      }
    }

    if (code !== 0) {
      try {
        await prisma.story.update({
          where: { id: storyId },
          data: { agentStatus: "FAILED" },
        });
      } catch (err) {
        console.error(`[agent-executor] failed to update status for ${storyId}:`, err);
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
            console.error(`[agent-executor] auto-review failed for ${storyId}:`, reviewErr);
          }
        }
      } catch (err) {
        console.error(`[agent-executor] failed to start preview for ${storyId}:`, err);
      }
    }
    // Notify caller to check if there's another story to process
    onComplete?.(projectId);
  });

  child.on("error", async (err) => {
    console.error(`[agent-executor] spawn error for ${story.shortId}:`, err.message);
    appendFileSync(logPath, `\nSPAWN ERROR: ${err.message}\n`);
    try {
      await prisma.story.update({
        where: { id: storyId },
        data: { agentStatus: "FAILED" },
      });
    } catch (e) {
      console.error(`[agent-executor] failed to update status for ${storyId}:`, e);
    }
    onComplete?.(projectId);
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
