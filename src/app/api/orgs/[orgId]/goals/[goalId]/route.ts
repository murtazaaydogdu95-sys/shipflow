import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { updateGoalSchema } from "@/lib/validations/goal";
import { detectGoalCycle, validateMaxDepth, calculateGoalProgress } from "@/lib/goals";
import { ZodError } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, goalId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:read");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, orgId },
    include: {
      children: {
        include: {
          _count: { select: { stories: true, children: true } },
        },
      },
      stories: {
        select: {
          id: true,
          shortId: true,
          title: true,
          status: true,
          priority: true,
          storyPoints: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { stories: true, children: true } },
    },
  });

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const progress = await calculateGoalProgress(goalId);

  return NextResponse.json({ ...goal, progress });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, goalId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:settings");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.goal.findFirst({
    where: { id: goalId, orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = updateGoalSchema.parse(parsed.data);
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

  // Validate parentId if changing
  if (data.parentId !== undefined && data.parentId !== existing.parentId) {
    if (data.parentId) {
      if (data.parentId === goalId) {
        return NextResponse.json(
          { error: "A goal cannot be its own parent" },
          { status: 400 }
        );
      }

      const parentGoal = await prisma.goal.findFirst({
        where: { id: data.parentId, orgId },
      });
      if (!parentGoal) {
        return NextResponse.json(
          { error: "Parent goal not found in this organization" },
          { status: 400 }
        );
      }

      const hasCycle = await detectGoalCycle(goalId, data.parentId);
      if (hasCycle) {
        return NextResponse.json(
          { error: "Setting this parent would create a cycle" },
          { status: 400 }
        );
      }

      const depthOk = await validateMaxDepth(data.parentId);
      if (!depthOk) {
        return NextResponse.json(
          { error: "Maximum goal hierarchy depth of 3 levels exceeded" },
          { status: 400 }
        );
      }
    }
  }

  try {
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
        ...(data.ownerAgentId !== undefined && { ownerAgentId: data.ownerAgentId || null }),
      },
      include: {
        _count: { select: { stories: true, children: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, goalId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:settings");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.goal.findFirst({
    where: { id: goalId, orgId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Unlink stories before deleting
  await prisma.story.updateMany({
    where: { goalId },
    data: { goalId: null },
  });

  // Unlink child goals
  await prisma.goal.updateMany({
    where: { parentId: goalId },
    data: { parentId: null },
  });

  await prisma.goal.delete({ where: { id: goalId } });

  return NextResponse.json({ ok: true });
}
