import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public, unauthenticated endpoint for viewing a public project's board.
 * Returns only safe fields — no descriptions, comments, agent logs, API keys, or user details.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      isPublic: true,
      techStack: true,
      labels: { select: { id: true, name: true, color: true } },
    },
  });

  if (!project || !project.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stories = await prisma.story.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      shortId: true,
      title: true,
      status: true,
      type: true,
      priority: true,
      storyPoints: true,
      position: true,
      labels: {
        select: {
          label: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({
    project: {
      name: project.name,
      slug: project.slug,
      techStack: project.techStack,
      labels: project.labels,
    },
    stories: stories.map((s) => ({
      id: s.id,
      shortId: s.shortId,
      title: s.title,
      status: s.status,
      type: s.type,
      priority: s.priority,
      storyPoints: s.storyPoints,
      position: s.position,
      labels: s.labels.map((l) => l.label),
    })),
  });
}
