import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSprintSchema } from "@/lib/validations/sprint";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, sprintId } = await params;
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    include: {
      stories: {
        include: {
          labels: { include: { label: true } },
          acceptanceCriteria: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sprint);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, sprintId } = await params;
  const body = await req.json();
  const data = updateSprintSchema.parse(body);

  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId } });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle status transitions
  if (data.status === "ACTIVE" && sprint.status === "PLANNING") {
    // Ensure no other active sprint
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId, status: "ACTIVE", id: { not: sprintId } },
    });
    if (activeSprint) {
      return NextResponse.json(
        { error: "Another sprint is already active. Complete it first." },
        { status: 400 }
      );
    }
  }

  if (data.status === "COMPLETED" && sprint.status === "ACTIVE") {
    // Move incomplete stories back to backlog
    await prisma.story.updateMany({
      where: { sprintId, status: { not: "DONE" } },
      data: { sprintId: null, status: "BACKLOG" },
    });

    await prisma.activity.create({
      data: {
        type: "SPRINT_COMPLETED",
        message: `Sprint "${sprint.name}" completed`,
        projectId,
        userId: session.user.id,
      },
    });
  }

  const updated = await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      name: data.name,
      goal: data.goal,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, sprintId } = await params;

  // Unassign stories from this sprint
  await prisma.story.updateMany({
    where: { sprintId },
    data: { sprintId: null },
  });

  await prisma.sprint.deleteMany({ where: { id: sprintId, projectId } });
  return NextResponse.json({ success: true });
}
