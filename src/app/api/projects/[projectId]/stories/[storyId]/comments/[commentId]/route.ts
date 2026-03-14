import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string; commentId: string }> }
) {
  const { projectId, storyId, commentId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, storyId },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.userId !== access.userId) {
    return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
