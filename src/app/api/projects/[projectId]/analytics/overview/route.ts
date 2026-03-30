import { NextRequest, NextResponse } from "next/server";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { sanitizeError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const access = await requireProjectAccess(req, projectId);
    if (!access) return unauthorizedResponse();

    const sprints = await prisma.sprint.findMany({
      where: { projectId, status: "COMPLETED" },
      include: {
        stories: {
          select: { storyPoints: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const velocityData = sprints.map((sprint) => ({
      name: sprint.name,
      committed: sprint.stories.reduce(
        (sum, s) => sum + (s.storyPoints || 0),
        0
      ),
      completed: sprint.stories
        .filter((s) => s.status === "DONE")
        .reduce((sum, s) => sum + (s.storyPoints || 0), 0),
    }));

    const storyCounts = await prisma.story.groupBy({
      by: ["status"],
      where: { projectId },
      _count: true,
    });

    const priorityCounts = await prisma.story.groupBy({
      by: ["priority"],
      where: { projectId },
      _count: true,
    });

    return NextResponse.json({ velocityData, storyCounts, priorityCounts });
  } catch (err) {
    const msg = sanitizeError(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
