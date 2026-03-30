import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Count unread notifications
    const notifications = await prisma.notification.count({
      where: { userId, read: false },
    });

    // Count unread stories: stories in user's projects where
    // updatedAt > readState.readAt or no ReadState exists
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMembers.map((pm) => pm.projectId);

    let stories = 0;
    if (projectIds.length > 0) {
      // Get all read states for stories
      const readStates = await prisma.readState.findMany({
        where: { userId, entityType: "story" },
        select: { entityId: true, readAt: true },
      });

      const readMap = new Map(
        readStates.map((rs) => [rs.entityId, rs.readAt])
      );

      // Count stories that are either unread (no ReadState) or
      // updated after the ReadState
      const allStories = await prisma.story.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, updatedAt: true },
      });

      stories = allStories.filter((story) => {
        const readAt = readMap.get(story.id);
        if (!readAt) return true;
        return story.updatedAt > readAt;
      }).length;
    }

    return NextResponse.json({
      notifications,
      stories,
      total: notifications + stories,
    });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
