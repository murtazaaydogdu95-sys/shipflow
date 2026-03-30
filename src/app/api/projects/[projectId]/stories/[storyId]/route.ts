import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { updateStorySchema } from "@/lib/validations/story";
import { processNextStory } from "@/lib/agent-trigger";
import { createNotification, sendNotificationEmail } from "@/lib/notifications";
import { storyAssignedEmail, agentCompletedEmail } from "@/lib/email-templates";
import { apiRateLimit } from "@/lib/rate-limit";
import { dispatchWebhook } from "@/lib/webhooks";
import { isValidTransition, getValidTransitions } from "@/lib/story-state-machine";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  if (access.type === "apikey") {
    const result = await apiRateLimit.check(access.projectId);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  const story = await prisma.story.findFirst({
    where: { id: storyId, projectId },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
      assignee: { select: { id: true, name: true, image: true } },
      parent: { select: { id: true, shortId: true, title: true } },
      children: { select: { id: true, shortId: true, title: true, status: true, priority: true, type: true, storyPoints: true, assigneeId: true } },
      blockedByDeps: { include: { blocker: { select: { id: true, shortId: true, title: true, status: true } } } },
      blockingDeps: { include: { blocked: { select: { id: true, shortId: true, title: true, status: true } } } },
      attachments: { orderBy: { createdAt: "desc" } },
      activities: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(story);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  if (access.type === "apikey") {
    const rl = await apiRateLimit.check(access.projectId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  const parsed = await parseJsonBody(req, 512_000);
  if (!parsed.ok) return parsed.response;
  const data = updateStorySchema.parse(parsed.data);

  const existing = await prisma.story.findFirst({ where: { id: storyId, projectId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Validate parentId if provided
  if (data.parentId !== undefined && data.parentId !== null) {
    if (data.parentId === storyId) {
      return NextResponse.json({ error: "A story cannot be its own parent" }, { status: 400 });
    }
    const parent = await prisma.story.findFirst({
      where: { id: data.parentId, projectId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent story not found in this project" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json({ error: "Sub-tasks cannot have sub-tasks (max nesting depth is 1)" }, { status: 400 });
    }
    // Prevent making a parent story into a sub-task if it has children
    const childCount = await prisma.story.count({ where: { parentId: storyId } });
    if (childCount > 0) {
      return NextResponse.json({ error: "Cannot set parent on a story that has children" }, { status: 400 });
    }
  }

  // Validate status transition
  if (data.status && data.status !== existing.status) {
    if (!isValidTransition(existing.status, data.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${data.status}`,
          validTransitions: getValidTransitions(existing.status),
        },
        { status: 422 }
      );
    }

    // Enforce diff review before moving agent-completed stories to DONE
    if (data.status === "DONE" && existing.status === "REVIEW" && existing.assignedToAgent) {
      if (!existing.reviewedAt) {
        return NextResponse.json(
          { error: "Code review required before approval. View the diff first." },
          { status: 422 }
        );
      }
    }

    // Check WIP limit for target status (skip for API key / agent access)
    if (access.type === "session") {
      const proj = await prisma.project.findUnique({
        where: { id: projectId },
        select: { wipLimits: true },
      });
      if (proj?.wipLimits) {
        const limits = proj.wipLimits as Record<string, number | null>;
        const limit = limits[data.status];
        if (limit != null) {
          const currentCount = await prisma.story.count({
            where: { projectId, status: data.status, id: { not: storyId } },
          });
          if (currentCount >= limit) {
            return NextResponse.json(
              { error: `WIP limit reached for ${data.status} (${currentCount}/${limit})` },
              { status: 422 }
            );
          }
        }
      }
    }
  }

  // Handle label updates
  if (data.labelIds) {
    // Verify all labels belong to this project
    const validLabels = await prisma.label.findMany({
      where: { id: { in: data.labelIds }, projectId },
      select: { id: true },
    });
    if (validLabels.length !== data.labelIds.length) {
      return NextResponse.json({ error: "Some labels not found in this project" }, { status: 400 });
    }
    await prisma.storyLabel.deleteMany({ where: { storyId } });
    await prisma.storyLabel.createMany({
      data: data.labelIds.map((labelId) => ({ storyId, labelId })),
    });
  }

  // Handle acceptance criteria updates
  if (data.acceptanceCriteria) {
    await prisma.acceptanceCriterion.deleteMany({ where: { storyId } });
    await prisma.acceptanceCriterion.createMany({
      data: data.acceptanceCriteria.map((ac, i) => ({
        storyId,
        given: ac.given,
        when: ac.when,
        then: ac.then,
        position: i,
      })),
    });
  }

  const { labelIds, acceptanceCriteria, ...updateData } = data;

  // Clear review confirmation when moving away from REVIEW
  const reviewReset = (data.status && existing.status === "REVIEW" && data.status !== "REVIEW")
    ? { reviewedAt: null, reviewedBy: null }
    : {};

  const story = await prisma.story.update({
    where: { id: storyId },
    data: { ...updateData, ...reviewReset },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  // Look up project orgId for activity
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  // Track status changes
  if (data.status && data.status !== existing.status) {
    await prisma.activity.create({
      data: {
        type: "STORY_MOVED",
        message: `Moved from ${existing.status} to ${data.status}`,
        projectId,
        storyId,
        userId: access.type === "session" ? access.userId : null,
        orgId: project?.orgId,
      },
    });

  }

  // Notify assignee when assigned
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    const actorId = access.type === "session" ? access.userId : null;
    if (data.assigneeId !== actorId) {
      createNotification({
        userId: data.assigneeId,
        type: "STORY_ASSIGNED",
        title: "Story assigned to you",
        message: `You were assigned to ${story.shortId}: ${story.title}`,
        href: `/projects/${projectId}?story=${storyId}`,
      }).catch(console.error);

      // Send email notification
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { email: true },
      });
      const assigner = actorId
        ? await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } })
        : null;
      if (assignee?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const projectData = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
        const emailData = storyAssignedEmail({
          storyTitle: story.title,
          projectName: projectData?.name || "a project",
          assignerName: assigner?.name || "Someone",
          storyUrl: `${appUrl}/projects/${projectId}?story=${storyId}`,
        });
        sendNotificationEmail({
          userId: data.assigneeId,
          email: assignee.email,
          ...emailData,
        }).catch(console.error);
      }
    }
  }

  // Notify when agent completes
  if (data.agentStatus === "COMPLETED" && existing.agentStatus !== "COMPLETED") {
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true } } },
    });
    const projectData = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const pm of projectMembers) {
      createNotification({
        userId: pm.userId,
        type: "AGENT_COMPLETED",
        title: "Agent completed",
        message: `Agent completed ${story.shortId}: ${story.title}`,
        href: `/projects/${projectId}?story=${storyId}`,
      }).catch(console.error);

      // Send email notification
      if (pm.user.email) {
        const emailData = agentCompletedEmail({
          storyTitle: story.title,
          projectName: projectData?.name || "a project",
          storyUrl: `${appUrl}/projects/${projectId}?story=${storyId}`,
        });
        sendNotificationEmail({
          userId: pm.userId,
          email: pm.user.email,
          ...emailData,
        }).catch(console.error);
      }
    }
  }

  // Dispatch webhook
  dispatchWebhook(projectId, "story.updated", {
    storyId: story.id,
    shortId: story.shortId,
    title: story.title,
    status: story.status,
    priority: story.priority,
  }).catch(console.error);

  // When a story moves to DONE (approved) or any status change, check queue for next story
  if (data.status && data.status !== existing.status) {
    processNextStory(projectId).catch(console.error);
  }

  return NextResponse.json(story);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  await prisma.story.deleteMany({ where: { id: storyId, projectId } });

  return NextResponse.json({ success: true });
}
