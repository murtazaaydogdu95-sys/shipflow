import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { execSync } from "child_process";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const { shortId, title, branchName } = await req.json();

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

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.user.id } },
    },
    select: { agentWorkingDir: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json(
      { error: "No working directory configured. Set one in Project Settings." },
      { status: 400 }
    );
  }

  const cwd = project.agentWorkingDir;
  const opts = { cwd, encoding: "utf-8" as const, timeout: 30000 };

  try {
    if (branchName) {
      // Branch merge workflow: commit remaining changes on branch, merge to main, push
      execSync(`git checkout ${branchName}`, opts);
      execSync("git add .", opts);
      const status = execSync("git status --porcelain", opts).trim();
      if (status) {
        const commitMsg = `${commitPrefix}(${shortId}): ${title}`;
        execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, opts);
      }

      execSync("git checkout main", opts);
      const mergeMsg = `Merge ${branchName}: ${title} [${shortId}]`;
      execSync(`git merge ${branchName} --no-ff -m "${mergeMsg.replace(/"/g, '\\"')}"`, opts);
      execSync("git push origin main", { ...opts, timeout: 60000 });

      // Clean up feature branch
      try {
        execSync(`git branch -d ${branchName}`, opts);
      } catch {
        // Branch delete can fail if not fully merged, force it
        execSync(`git branch -D ${branchName}`, opts);
      }

      return NextResponse.json({ success: true, branch: "main", merged: branchName });
    }

    // Legacy direct push workflow (backward compat)
    execSync("git add .", opts);
    const status = execSync("git status --porcelain", opts).trim();
    if (status) {
      const commitMsg = `${commitPrefix}(${shortId}): ${title}`;
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, opts);
    }

    const branch = execSync("git rev-parse --abbrev-ref HEAD", opts).trim();
    execSync(`git push origin ${branch}`, { ...opts, timeout: 60000 });

    return NextResponse.json({ success: true, branch });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git operation failed";
    console.error("[git-push] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
