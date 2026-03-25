import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

/**
 * POST: Mark that the current user has reviewed the diff for this story.
 * Sets reviewedAt + reviewedBy on the story record.
 * Required before moving an agent-completed story from REVIEW to DONE.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findFirst({
    where: { id: storyId, projectId },
    select: { id: true, status: true, branchName: true, assignedToAgent: true },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  if (story.status !== "REVIEW") {
    return NextResponse.json({ error: "Story is not in REVIEW status" }, { status: 422 });
  }

  const userId = access.type === "session" ? access.userId : `apikey:${access.projectId}`;

  await prisma.story.update({
    where: { id: storyId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: userId,
    },
  });

  return NextResponse.json({ confirmed: true, reviewedAt: new Date().toISOString() });
}
