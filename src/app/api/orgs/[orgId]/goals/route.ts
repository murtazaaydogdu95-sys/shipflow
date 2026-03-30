import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { createGoalSchema } from "@/lib/validations/goal";
import { detectGoalCycle, validateMaxDepth, calculateGoalProgress } from "@/lib/goals";
import { ZodError } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:read");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const status = searchParams.get("status");
  const withProgress = searchParams.get("progress") === "true";

  const where: Record<string, unknown> = { orgId };
  if (level) where.level = level;
  if (status) where.status = status;

  const goals = await prisma.goal.findMany({
    where,
    include: {
      children: { select: { id: true } },
      _count: { select: { stories: true, children: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (withProgress) {
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const progress = await calculateGoalProgress(goal.id);
        return { ...goal, progress };
      })
    );
    return NextResponse.json(goalsWithProgress);
  }

  return NextResponse.json(goals);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:settings");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = createGoalSchema.parse(parsed.data);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return NextResponse.json(
        { error: `Validation failed: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    throw err;
  }

  // Validate parentId if provided
  if (data.parentId) {
    const parentGoal = await prisma.goal.findFirst({
      where: { id: data.parentId, orgId },
    });
    if (!parentGoal) {
      return NextResponse.json(
        { error: "Parent goal not found in this organization" },
        { status: 400 }
      );
    }

    // Check max depth (3 levels)
    const depthOk = await validateMaxDepth(data.parentId);
    if (!depthOk) {
      return NextResponse.json(
        { error: "Maximum goal hierarchy depth of 3 levels exceeded" },
        { status: 400 }
      );
    }
  }

  try {
    const goal = await prisma.goal.create({
      data: {
        orgId,
        title: data.title,
        description: data.description,
        level: data.level,
        status: data.status,
        parentId: data.parentId,
        ownerAgentId: data.ownerAgentId,
      },
      include: {
        _count: { select: { stories: true, children: true } },
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
