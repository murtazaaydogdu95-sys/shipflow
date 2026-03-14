import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string; depId: string }> }
) {
  const { projectId, depId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  await prisma.storyDependency.deleteMany({ where: { id: depId } });
  return NextResponse.json({ success: true });
}
