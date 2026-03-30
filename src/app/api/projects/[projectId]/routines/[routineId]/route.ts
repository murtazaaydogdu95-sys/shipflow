import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";
import { parseJsonBody, sanitizeError, sanitizeValidationError } from "@/lib/api-error";
import { updateRoutineSchema } from "@/lib/validations/routine";
import { computeNextTriggerTime } from "@/lib/routine-engine";

type RouteParams = { params: Promise<{ projectId: string; routineId: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const { projectId, routineId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  try {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, projectId },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            source: true,
            status: true,
            storyId: true,
            skipReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!routine) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    const { webhookSecret: _secret, ...routineWithoutSecret } = routine;
    return NextResponse.json(routineWithoutSecret);
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to get routine") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { projectId, routineId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const validation = updateRoutineSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: sanitizeValidationError(validation.error) },
      { status: 400 }
    );
  }

  const input = validation.data;

  try {
    const existing = await prisma.routine.findFirst({
      where: { id: routineId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    // Check name uniqueness if name is being changed
    if (input.name && input.name !== existing.name) {
      const nameConflict = await prisma.routine.findFirst({
        where: { projectId, name: input.name, id: { not: routineId } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: "A routine with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Recompute nextTriggerAt if cron or timezone changed
    const cronExpr = input.cronExpression ?? existing.cronExpression;
    const tz = input.timezone ?? existing.timezone;
    const needsRecalc =
      input.cronExpression !== undefined || input.timezone !== undefined;

    const updateData: Record<string, unknown> = { ...input };
    if (needsRecalc) {
      updateData.nextTriggerAt = computeNextTriggerTime(cronExpr, tz);
    }

    const routine = await prisma.routine.update({
      where: { id: routineId },
      data: updateData,
    });

    const { webhookSecret: _secret, ...routineWithoutSecret } = routine;
    return NextResponse.json(routineWithoutSecret);
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to update routine") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const { projectId, routineId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  try {
    const existing = await prisma.routine.findFirst({
      where: { id: routineId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    await prisma.routine.delete({ where: { id: routineId } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to delete routine") },
      { status: 500 }
    );
  }
}
