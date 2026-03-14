import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ stories: [], projects: [] });
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return NextResponse.json({ stories: [], projects: [] });
  }

  const results: { stories: unknown[]; projects: unknown[] } = {
    stories: [],
    projects: [],
  };

  if (type === "all" || type === "stories") {
    results.stories = await prisma.story.findMany({
      where: {
        project: { orgId },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { shortId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        shortId: true,
        title: true,
        status: true,
        priority: true,
        projectId: true,
        project: { select: { name: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });
  }

  if (type === "all" || type === "projects") {
    results.projects = await prisma.project.findMany({
      where: {
        orgId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { stories: true } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });
  }

  return NextResponse.json(results);
}
