import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startPreview, stopPreview } from "@/lib/preview-manager";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;

  try {
    const { port, pid } = await startPreview(storyId, projectId);
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { shortId: true },
    });
    return NextResponse.json({ port, pid, url: `/api/preview/${story!.shortId}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storyId } = await params;

  try {
    await stopPreview(storyId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
