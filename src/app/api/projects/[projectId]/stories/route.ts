import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { createStorySchema } from "@/lib/validations/story";
import { processNextStory } from "@/lib/agent-trigger";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sprintId = searchParams.get("sprintId");

  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (sprintId) where.sprintId = sprintId;

  const stories = await prisma.story.findMany({
    where,
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: { orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(stories);
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = createStorySchema.parse(body);

  // Generate shortId
  const count = await prisma.story.count({ where: { projectId } });
  const shortId = `SF-${String(count + 1).padStart(3, "0")}`;

  // Get next position
  const lastStory = await prisma.story.findFirst({
    where: { projectId, status: data.status || "BACKLOG" },
    orderBy: { position: "desc" },
  });
  const position = (lastStory?.position ?? -1) + 1;

  const story = await prisma.story.create({
    data: {
      shortId,
      title: data.title,
      description: data.description,
      rawInput: data.rawInput,
      userStory: data.userStory,
      status: data.status || "BACKLOG",
      priority: data.priority || "MEDIUM",
      storyPoints: data.storyPoints,
      position,
      projectId,
      sprintId: data.sprintId,
      acceptanceCriteria: data.acceptanceCriteria
        ? {
            create: data.acceptanceCriteria.map((ac, i) => ({
              given: ac.given,
              when: ac.when,
              then: ac.then,
              position: i,
            })),
          }
        : undefined,
      labels: data.labelIds
        ? { create: data.labelIds.map((labelId) => ({ labelId })) }
        : undefined,
    },
    include: {
      labels: { include: { label: true } },
      acceptanceCriteria: true,
    },
  });

  // Create activity
  await prisma.activity.create({
    data: {
      type: "STORY_CREATED",
      message: `Created story: ${story.title}`,
      projectId,
      storyId: story.id,
      userId: authResult.type === "session" ? authResult.userId : null,
    },
  });

  // Check if the agent queue should pick up this or another story
  processNextStory(projectId).catch(console.error);

  return NextResponse.json(story);
}
