import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/api-error";
import { z } from "zod";

const addDependencySchema = z.object({
  blockerId: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deps = await prisma.storyDependency.findMany({
    where: { blockedId: storyId },
    include: {
      blocker: { select: { id: true, shortId: true, title: true, status: true } },
    },
  });

  const blocking = await prisma.storyDependency.findMany({
    where: { blockerId: storyId },
    include: {
      blocked: { select: { id: true, shortId: true, title: true, status: true } },
    },
  });

  return NextResponse.json({ blockedBy: deps, blocking });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 1024);
  if (!parsed.ok) return parsed.response;
  const { blockerId } = addDependencySchema.parse(parsed.data);

  if (blockerId === storyId) {
    return NextResponse.json({ error: "A story cannot block itself" }, { status: 400 });
  }

  // Verify both stories belong to the project
  const [blocker, blocked] = await Promise.all([
    prisma.story.findFirst({ where: { id: blockerId, projectId } }),
    prisma.story.findFirst({ where: { id: storyId, projectId } }),
  ]);

  if (!blocker || !blocked) {
    return NextResponse.json({ error: "Story not found in this project" }, { status: 404 });
  }

  // Check for circular dependency
  const reverseExists = await prisma.storyDependency.findFirst({
    where: { blockerId: storyId, blockedId: blockerId },
  });
  if (reverseExists) {
    return NextResponse.json({ error: "Circular dependency detected" }, { status: 400 });
  }

  const dep = await prisma.storyDependency.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId: storyId } },
    update: {},
    create: { blockerId, blockedId: storyId },
    include: {
      blocker: { select: { id: true, shortId: true, title: true, status: true } },
    },
  });

  return NextResponse.json(dep);
}
