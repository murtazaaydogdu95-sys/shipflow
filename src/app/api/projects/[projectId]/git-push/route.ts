import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { execFileSync } from "child_process";
import { sanitizeError, parseJsonBody } from "@/lib/api-error";
import { isGithubAppConfigured, getInstallationToken } from "@/lib/github-app";

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
    select: { agentWorkingDir: true, githubInstallationId: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json(
      { error: "No working directory configured. Set one in Project Settings." },
      { status: 400 }
    );
  }

  // Resolve a push token: prefer the project's GitHub App installation token
  // (per-tenant), then the user's GitHub OAuth token, then a platform PAT.
  let githubToken: string | null = null;
  if (project.githubInstallationId && isGithubAppConfigured()) {
    try {
      githubToken = await getInstallationToken(project.githubInstallationId);
    } catch {
      // fall through to other token sources
    }
  }
  if (!githubToken && access.type === "session") {
    const account = await prisma.account.findFirst({
      where: { userId: access.userId, provider: "github" },
      select: { access_token: true },
    });
    githubToken = account?.access_token ?? null;
  }
  if (!githubToken) githubToken = process.env.GIT_GITHUB_TOKEN ?? null;

  const cwd = project.agentWorkingDir;
  const opts = { cwd, encoding: "utf-8" as const, timeout: 30000 };

  // Build an authed remote URL: strip ANY existing credentials first, then inject
  // the token. (The workspace remote may already embed a per-tenant token, which
  // would otherwise produce https://x-access-token:T1@x-access-token:T2@github.com.)
  const authedUrl = (): string => {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], opts).trim();
    const base = remoteUrl.replace(/^https:\/\/[^@/]+@/, "https://");
    return githubToken ? base.replace(/^https:\/\//, `https://x-access-token:${githubToken}@`) : base;
  };

  // Helper: fetch a branch from origin (needed when the branch was pushed by an
  // isolated runner pod and isn't present in this workspace yet).
  const fetchBranch = (branch: string) => {
    try {
      execFileSync("git", ["fetch", authedUrl(), branch], { ...opts, timeout: 60000 });
    } catch {
      // Branch may already be local / not on remote — handled by checkout below
    }
  };

  // Helper: pull remote changes (rebase) before pushing to avoid rejection
  const pullBeforePush = (branch: string) => {
    try {
      execFileSync("git", ["pull", "--rebase", authedUrl(), branch], { ...opts, timeout: 60000 });
    } catch {
      // Pull may fail if remote branch doesn't exist yet — that's fine
    }
  };

  // Helper: push with a token-authenticated URL (creds never persisted in remote)
  const authenticatedPush = (branch: string) => {
    pullBeforePush(branch);
    execFileSync("git", ["push", authedUrl(), branch], { ...opts, timeout: 60000 });
  };

  try {
    if (branchName) {
      // Branch merge workflow: commit remaining changes on branch, merge to main, push.
      // Fetch first so a branch pushed by an isolated runner pod (not present in this
      // workspace) is available to check out.
      fetchBranch(branchName);
      try {
        execFileSync("git", ["checkout", branchName], opts);
      } catch {
        // Not a local branch (pod-mode run) — create it from what we just fetched
        execFileSync("git", ["checkout", "-B", branchName, "FETCH_HEAD"], opts);
      }
      execFileSync("git", ["add", "."], opts);
      const status = execFileSync("git", ["status", "--porcelain"], opts).trim();
      if (status) {
        const commitMsg = `${commitPrefix}(${shortId}): ${title}`;
        execFileSync("git", ["commit", "-m", commitMsg], opts);
      }

      execFileSync("git", ["checkout", "main"], opts);
      pullBeforePush("main"); // bring main up to date before merging
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
