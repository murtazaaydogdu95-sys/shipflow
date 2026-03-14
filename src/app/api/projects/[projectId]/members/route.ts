import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Get project's orgId, then list org members
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  if (project?.orgId) {
    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId: project.orgId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });
    return NextResponse.json(
      orgMembers.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
      }))
    );
  }

  // Fallback: list project members
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
    }))
  );
}
