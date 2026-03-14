import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { updateSprintSchema } from "@/lib/validations/sprint";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  const { projectId, sprintId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
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
  const { projectId, sprintId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = updateSprintSchema.parse(parsed.data);

  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId } });
  if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Validate sprint status transitions: PLANNING → ACTIVE → COMPLETED (no skipping, no going back)
  if (data.status && data.status !== sprint.status) {
    const VALID_SPRINT_TRANSITIONS: Record<string, string[]> = {
      PLANNING: ["ACTIVE"],
      ACTIVE: ["COMPLETED"],
      COMPLETED: [],
    };
    const allowed = VALID_SPRINT_TRANSITIONS[sprint.status] || [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json(
        { error: `Invalid sprint transition from ${sprint.status} to ${data.status}`, validTransitions: allowed },
        { status: 422 }
      );
    }
  }

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
        userId: access.type === "session" ? access.userId : null,
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
  const { projectId, sprintId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Unassign stories from this sprint
  await prisma.story.updateMany({
    where: { sprintId },
    data: { sprintId: null },
  });

  await prisma.sprint.deleteMany({ where: { id: sprintId, projectId } });
  return NextResponse.json({ success: true });
}
