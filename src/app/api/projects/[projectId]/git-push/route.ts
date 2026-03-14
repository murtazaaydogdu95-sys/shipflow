import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { execFileSync } from "child_process";
import { sanitizeError, parseJsonBody } from "@/lib/api-error";

const BRANCH_NAME_RE = /^[a-zA-Z0-9\/_.\-]+$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as { shortId: string; title: string; branchName?: string };

  const { shortId, title, branchName } = body;

  // Validate branch name to prevent injection
  if (branchName && !BRANCH_NAME_RE.test(branchName)) {
    return NextResponse.json({ error: "Invalid branch name" }, { status: 400 });
  }

  // Fetch story type for commit prefix
  const story = await prisma.story.findFirst({
    where: { shortId, project: { id: projectId } },
    select: { type: true },
  });

  const COMMIT_PREFIX: Record<string, string> = {
    feature: "feat",
    bug: "fix",
    chore: "chore",
    refactor: "refactor",
    docs: "docs",
    test: "test",
  };
  const commitPrefix = COMMIT_PREFIX[story?.type ?? "feature"] || "feat";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json(
      { error: "No working directory configured. Set one in Project Settings." },
      { status: 400 }
    );
  }

  // Get GitHub token for authenticated push
  let githubToken: string | null = null;
  if (access.type === "session") {
    const account = await prisma.account.findFirst({
      where: { userId: access.userId, provider: "github" },
      select: { access_token: true },
    });
    githubToken = account?.access_token ?? null;
  }

  const cwd = project.agentWorkingDir;
  const opts = { cwd, encoding: "utf-8" as const, timeout: 30000 };

  // Helper: push with token-authenticated URL, then restore clean URL
  const authenticatedPush = (branch: string) => {
    if (githubToken) {
      // Read current remote URL and inject token
      const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], opts).trim();
      const authedUrl = remoteUrl.replace(
        /^https:\/\//,
        `https://x-access-token:${githubToken}@`
      );
      try {
        execFileSync("git", ["push", authedUrl, branch], { ...opts, timeout: 60000 });
      } finally {
        // Ensure clean URL is always restored (never persist token in remote)
        execFileSync("git", ["remote", "set-url", "origin", remoteUrl], opts);
      }
    } else {
      // Fallback: push without token (may work with SSH remotes or credential helpers)
      execFileSync("git", ["push", "origin", branch], { ...opts, timeout: 60000 });
    }
  };

  try {
    if (branchName) {
      // Branch merge workflow: commit remaining changes on branch, merge to main, push
      execFileSync("git", ["checkout", branchName], opts);
      execFileSync("git", ["add", "."], opts);
      const status = execFileSync("git", ["status", "--porcelain"], opts).trim();
      if (status) {
        const commitMsg = `${commitPrefix}(${shortId}): ${title}`;
        execFileSync("git", ["commit", "-m", commitMsg], opts);
      }

      execFileSync("git", ["checkout", "main"], opts);
      const mergeMsg = `Merge ${branchName}: ${title} [${shortId}]`;
      execFileSync("git", ["merge", branchName, "--no-ff", "-m", mergeMsg], opts);
      authenticatedPush("main");

      // Clean up feature branch
      try {
        execFileSync("git", ["branch", "-d", branchName], opts);
      } catch {
        // Branch delete can fail if not fully merged, force it
        execFileSync("git", ["branch", "-D", branchName], opts);
      }

      return NextResponse.json({ success: true, branch: "main", merged: branchName });
    }

    // Legacy direct push workflow (backward compat)
    execFileSync("git", ["add", "."], opts);
    const status = execFileSync("git", ["status", "--porcelain"], opts).trim();
    if (status) {
      const commitMsg = `${commitPrefix}(${shortId}): ${title}`;
      execFileSync("git", ["commit", "-m", commitMsg], opts);
    }

    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], opts).trim();
    authenticatedPush(branch);

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    const message = sanitizeError(error, "Git operation failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
