import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { moveStorySchema } from "@/lib/validations/story";
import { processNextStory } from "@/lib/agent-trigger";
import { createNotification } from "@/lib/notifications";
import { dispatchWebhook } from "@/lib/webhooks";
import { isValidTransition, getValidTransitions } from "@/lib/story-state-machine";
import { parseJsonBody } from "@/lib/api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  const parsed = await parseJsonBody(req, 1024);
  if (!parsed.ok) return parsed.response;
  const { status, position } = moveStorySchema.parse(parsed.data);

  // Look up project orgId and wipLimits for activity (safe to do outside tx)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true, wipLimits: true },
  });

  // Wrap find + validate + reposition in a transaction to prevent TOCTOU races
  const txResult = await prisma.$transaction(async (tx) => {
    const story = await tx.story.findFirst({ where: { id: storyId, projectId } });
    if (!story) return { error: "Not found", httpStatus: 404 } as const;

    // Validate status transition
    if (story.status !== status) {
      if (!isValidTransition(story.status, status)) {
        return {
          error: `Invalid status transition from ${story.status} to ${status}`,
          validTransitions: getValidTransitions(story.status),
          httpStatus: 422,
        } as const;
      }

      // Check WIP limit for target status (skip if request comes from API key / agent)
      if (access.type === "session" && project?.wipLimits) {
        const limits = project.wipLimits as Record<string, number | null>;
        const limit = limits[status];
        if (limit != null) {
          const currentCount = await tx.story.count({
            where: { projectId, status, id: { not: storyId } },
          });
          if (currentCount >= limit) {
            return {
              error: `WIP limit reached for ${status} (${currentCount}/${limit})`,
              httpStatus: 422,
            } as const;
          }
        }
      }
    }

    const oldStatus = story.status;
    const oldPosition = story.position;

    // If moving within same column
    if (oldStatus === status) {
      if (oldPosition < position) {
        await tx.story.updateMany({
          where: {
            projectId, status,
            position: { gt: oldPosition, lte: position },
            id: { not: storyId },
          },
          data: { position: { decrement: 1 } },
        });
      } else if (oldPosition > position) {
        await tx.story.updateMany({
          where: {
            projectId, status,
            position: { gte: position, lt: oldPosition },
            id: { not: storyId },
          },
          data: { position: { increment: 1 } },
        });
      }
    } else {
      // Moving to different column — decrement source, increment target
      await tx.story.updateMany({
        where: {
          projectId, status: oldStatus,
          position: { gt: oldPosition },
          id: { not: storyId },
        },
        data: { position: { decrement: 1 } },
      });
      await tx.story.updateMany({
        where: {
          projectId, status,
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
          userId: access.type === "session" ? access.userId : null,
          orgId: project?.orgId,
        },
      });
    }

    return { success: true, oldStatus, story } as const;
  });

  // Handle transaction errors
  if ("error" in txResult) {
    return NextResponse.json(
      { error: txResult.error, ...("validTransitions" in txResult ? { validTransitions: txResult.validTransitions } : {}) },
      { status: txResult.httpStatus }
    );
  }

  const { oldStatus, story } = txResult;

  // Post-transaction side effects (notifications, webhooks, queue)
  if (oldStatus !== status) {
    processNextStory(projectId).catch(console.error);

    if (story.assigneeId) {
      const actorId = access.type === "session" ? access.userId : null;
      if (story.assigneeId !== actorId) {
        createNotification({
          userId: story.assigneeId,
          type: "STORY_STATUS_CHANGED",
          title: `Story moved to ${status}`,
          message: `${story.shortId}: ${story.title} was moved from ${oldStatus} to ${status}`,
          href: `/projects/${projectId}?story=${storyId}`,
        }).catch(console.error);
      }
    }

    dispatchWebhook(projectId, "story.moved", {
      storyId: story.id,
      shortId: story.shortId,
      title: story.title,
      oldStatus,
      newStatus: status,
    }).catch(console.error);
  }

  return NextResponse.json({ success: true });
}
