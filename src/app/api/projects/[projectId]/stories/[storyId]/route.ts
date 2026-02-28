import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { updateStorySchema } from "@/lib/validations/story";
import { processNextStory } from "@/lib/agent-trigger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const story = await prisma.story.findFirst({
    where: { id: storyId, projectId },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
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
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const data = updateStorySchema.parse(body);

  const existing = await prisma.story.findFirst({ where: { id: storyId, projectId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle label updates
  if (data.labelIds) {
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

  const story = await prisma.story.update({
    where: { id: storyId },
    data: updateData,
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
    },
  });

  // Track status changes
  if (data.status && data.status !== existing.status) {
    await prisma.activity.create({
      data: {
        type: "STORY_MOVED",
        message: `Moved from ${existing.status} to ${data.status}`,
        projectId,
        storyId,
        userId: authResult.type === "session" ? authResult.userId : null,
      },
    });

  }

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
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.story.deleteMany({ where: { id: storyId, projectId } });

  return NextResponse.json({ success: true });
}
