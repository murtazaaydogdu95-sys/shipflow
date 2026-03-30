import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { sanitizeError } from "@/lib/api-error";
import { getGitBin } from "@/lib/agent-executor";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findUnique({
    where: { id: storyId, projectId },
    select: { branchName: true },
  });

  if (!story?.branchName) {
    return NextResponse.json({ error: "No branch found" }, { status: 404 });
  }

  // Validate branch name to prevent git argument injection
  const BRANCH_NAME_RE = /^[a-zA-Z0-9\/_.\-]+$/;
  if (!BRANCH_NAME_RE.test(story.branchName)) {
    return NextResponse.json({ error: "Invalid branch name" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json({ error: "No working directory configured" }, { status: 400 });
  }

  try {
    const diff = execFileSync(
      "git",
      ["diff", `main...${story.branchName}`],
      {
        cwd: project.agentWorkingDir,
        encoding: "utf-8",
        timeout: 15000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );

    return NextResponse.json({ diff });
  } catch (err) {
    console.error("[diff] git diff failed:", sanitizeError(err, "Failed to generate diff"));
    return NextResponse.json({ diff: "", error: "Failed to generate diff" });
  }
}
