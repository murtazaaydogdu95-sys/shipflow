import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moveStorySchema } from "@/lib/validations/story";
import { processNextStory } from "@/lib/agent-trigger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;
  const body = await req.json();
  const { status, position } = moveStorySchema.parse(body);

  const story = await prisma.story.findFirst({ where: { id: storyId, projectId } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldStatus = story.status;
  const oldPosition = story.position;

  await prisma.$transaction(async (tx) => {
    // If moving within same column
    if (oldStatus === status) {
      if (oldPosition < position) {
        // Moving down: decrement positions between old and new
        await tx.story.updateMany({
          where: {
            projectId,
            status,
            position: { gt: oldPosition, lte: position },
            id: { not: storyId },
          },
          data: { position: { decrement: 1 } },
        });
      } else if (oldPosition > position) {
        // Moving up: increment positions between new and old
        await tx.story.updateMany({
          where: {
            projectId,
            status,
            position: { gte: position, lt: oldPosition },
            id: { not: storyId },
          },
          data: { position: { increment: 1 } },
        });
      }
    } else {
      // Moving to different column
      // Decrement positions in source column
      await tx.story.updateMany({
        where: {
          projectId,
          status: oldStatus,
          position: { gt: oldPosition },
          id: { not: storyId },
        },
        data: { position: { decrement: 1 } },
      });

      // Increment positions in target column
      await tx.story.updateMany({
        where: {
          projectId,
          status,
          position: { gte: position },
          id: { not: storyId },
        },
        data: { position: { increment: 1 } },
      });
    }

    // Update the moved story
    await tx.story.update({
      where: { id: storyId },
      data: { status, position },
    });

    // Log activity if status changed
    if (oldStatus !== status) {
      await tx.activity.create({
        data: {
          type: "STORY_MOVED",
          message: `Moved from ${oldStatus} to ${status}`,
          projectId,
          storyId,
          userId: session.user!.id,
        },
      });
    }
  });

  // Check queue on any status change
  if (oldStatus !== status) {
    processNextStory(projectId).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
