import { NextResponse } from "next/server";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { startPreview, stopPreview } from "@/lib/preview-manager";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/api-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { port, pid } = await startPreview(storyId, projectId);
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { shortId: true },
    });
    return NextResponse.json({ port, pid, url: `/api/preview/${story!.shortId}` });
  } catch (error) {
    sanitizeError(error, "Failed to start preview");
    return NextResponse.json({ error: "Failed to start preview" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await stopPreview(storyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    sanitizeError(error, "Failed to stop preview");
    return NextResponse.json({ error: "Failed to stop preview" }, { status: 500 });
  }
}
