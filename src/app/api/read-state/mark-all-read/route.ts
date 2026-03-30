import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/api-error";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    // Find all stories in user's projects that lack a ReadState
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMembers.map((pm) => pm.projectId);

    if (projectIds.length > 0) {
      const unreadStories = await prisma.story.findMany({
        where: {
          projectId: { in: projectIds },
          NOT: {
            id: {
              in: (
                await prisma.readState.findMany({
                  where: { userId, entityType: "story" },
                  select: { entityId: true },
                })
              ).map((rs) => rs.entityId),
            },
          },
        },
        select: { id: true },
      });

      if (unreadStories.length > 0) {
        const now = new Date();
        await prisma.readState.createMany({
          data: unreadStories.map((story) => ({
            userId,
            entityType: "story",
            entityId: story.id,
            readAt: now,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
