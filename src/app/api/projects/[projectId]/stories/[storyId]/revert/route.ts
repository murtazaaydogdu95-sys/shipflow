import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { execFileSync } from "child_process";
import { sanitizeError } from "@/lib/api-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findFirst({
    where: { id: storyId, projectId },
  });

  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  if (!story.branchName) {
    return NextResponse.json({ error: "No branch to revert" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json({ error: "No working directory configured" }, { status: 400 });
  }

  const opts = { cwd: project.agentWorkingDir, encoding: "utf-8" as const, timeout: 15000 };

  try {
    // Checkout main branch
    execFileSync("git", ["checkout", "main"], opts);
    // Delete the feature branch
    execFileSync("git", ["branch", "-D", story.branchName], opts);

    // Reset story state
    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: "TODO",
        agentStatus: null,
        assignedToAgent: false,
        branchName: null,
        commitHash: null,
        previewPort: null,
        previewPid: null,
        agentNotes: "Agent work reverted by user",
      },
    });

    return NextResponse.json({ success: true, message: `Reverted branch ${story.branchName}` });
  } catch (err) {
    sanitizeError(err, "Git revert failed");
    return NextResponse.json({ error: "Git revert failed" }, { status: 500 });
  }
}
