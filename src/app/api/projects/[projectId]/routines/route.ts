import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";
import { parseJsonBody, sanitizeError, sanitizeValidationError } from "@/lib/api-error";
import { createRoutineSchema } from "@/lib/validations/routine";
import { computeNextTriggerTime } from "@/lib/routine-engine";
import { randomBytes } from "crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  try {
    const routines = await prisma.routine.findMany({
      where: { projectId },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            storyId: true,
            skipReason: true,
            source: true,
            createdAt: true,
          },
        },
        _count: { select: { runs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = routines.map(({ webhookSecret: _secret, ...r }) => ({
      ...r,
      latestRun: r.runs[0] ?? null,
      totalRuns: r._count.runs,
      runs: undefined,
      _count: undefined,
    }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to list routines") },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const validation = createRoutineSchema.safeParse(parsed.data);
  if (!validation.success) {
    return NextResponse.json(
      { error: sanitizeValidationError(validation.error) },
      { status: 400 }
    );
  }

  const input = validation.data;

  try {
    // Check uniqueness
    const existing = await prisma.routine.findFirst({
      where: { projectId, name: input.name },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A routine with this name already exists in this project" },
        { status: 409 }
      );
    }

    const nextTriggerAt = computeNextTriggerTime(input.cronExpression, input.timezone);

    // Generate webhook secret if webhook is enabled
    const webhookSecret = input.webhookEnabled
      ? randomBytes(32).toString("hex")
      : null;

    const routine = await prisma.routine.create({
      data: {
        projectId,
        name: input.name,
        description: input.description ?? null,
        storyTemplate: input.storyTemplate,
        cronExpression: input.cronExpression,
        timezone: input.timezone,
        concurrencyPolicy: input.concurrencyPolicy,
        webhookEnabled: input.webhookEnabled,
        webhookSecret,
        webhookAuthType: input.webhookAuthType ?? "none",
        active: input.active,
        nextTriggerAt,
      },
    });

    const { webhookSecret: secret, ...routineWithoutSecret } = routine;
    return NextResponse.json({
      ...routineWithoutSecret,
      ...(routine.webhookEnabled ? { webhookSecretOnce: secret } : {}),
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to create routine") },
      { status: 500 }
    );
  }
}
