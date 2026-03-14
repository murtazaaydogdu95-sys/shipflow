import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { createCommentSchema } from "@/lib/validations/comment";
import { createNotification } from "@/lib/notifications";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify story belongs to this project
  const storyExists = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyExists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await prisma.comment.findMany({
    where: { storyId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = createCommentSchema.parse(parsed.data);

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      userId: access.userId,
      storyId,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  // Notify story assignee and creator (not the commenter)
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { assigneeId: true, title: true, shortId: true },
  });
  if (story) {
    const notifyUserIds = new Set<string>();
    if (story.assigneeId && story.assigneeId !== access.userId) {
      notifyUserIds.add(story.assigneeId);
    }
    for (const uid of notifyUserIds) {
      createNotification({
        userId: uid,
        type: "STORY_COMMENTED",
        title: "New comment",
        message: `${comment.user.name || "Someone"} commented on ${story.shortId}: ${data.content.slice(0, 100)}`,
        href: `/projects/${projectId}?story=${storyId}`,
      }).catch(console.error);
    }
  }

  return NextResponse.json(comment);
}
