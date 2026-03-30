import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { updateAgentSchema } from "@/lib/validations/agent";
import { ZodError } from "zod";

/**
 * Walk the agent hierarchy upward from `startId` to detect if `targetId` appears,
 * which would create a cycle if `targetId` reported to `startId`.
 */
async function detectHierarchyCycle(targetId: string, startId: string, orgId: string): Promise<boolean> {
  type Row = { reportsTo: string | null };
  const visited: string[] = [startId];
  let nextId: string | null = startId;

  for (let depth = 0; depth < 10; depth++) {
    if (nextId === targetId) return true;
    const rows: Row[] = await prisma.$queryRaw`
      SELECT "reportsTo" FROM "Agent" WHERE "id" = ${nextId} AND "orgId" = ${orgId}
    `;
    const parent = rows[0]?.reportsTo;
    if (!parent) break;
    if (visited.includes(parent)) break; // already circular in existing data
    visited.push(parent);
    nextId = parent;
  }
  return false;
}

// Valid agent status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_approval: ["idle", "terminated"],
  idle: ["paused", "terminated"],
  running: ["paused", "terminated"],
  paused: ["idle", "terminated"],
  terminated: [], // terminal state
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, agentId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:read");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, orgId },
    include: {
      assignedStories: {
        select: { id: true, shortId: true, title: true, status: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      subordinates: {
        select: { id: true, name: true, role: true, status: true },
      },
      reportingAgent: {
        select: { id: true, name: true, role: true },
      },
      _count: { select: { assignedStories: true, costEvents: true } },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Get cost summary
  const costSummary = await prisma.costEvent.aggregate({
    where: { agentId },
    _sum: { costCents: true, inputTokens: true, outputTokens: true },
    _count: true,
  });

  return NextResponse.json({
    ...agent,
    costSummary: {
      totalCostCents: costSummary._sum.costCents ?? 0,
      totalInputTokens: costSummary._sum.inputTokens ?? 0,
      totalOutputTokens: costSummary._sum.outputTokens ?? 0,
      eventCount: costSummary._count,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, agentId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:agent");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = updateAgentSchema.parse(parsed.data);
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

  // Find current agent
  const current = await prisma.agent.findFirst({
    where: { id: agentId, orgId },
  });
  if (!current) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Validate status transition if status is being changed
  if (data.status && data.status !== current.status) {
    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(data.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from '${current.status}' to '${data.status}'` },
        { status: 422 }
      );
    }
  }

  // Validate reportsTo to prevent cycles
  if (data.reportsTo !== undefined) {
    if (data.reportsTo === agentId) {
      return NextResponse.json(
        { error: "An agent cannot report to itself" },
        { status: 400 }
      );
    }
    if (data.reportsTo) {
      // Walk hierarchy to check for cycles (max depth 10)
      const cycleCheck = await detectHierarchyCycle(agentId, data.reportsTo, orgId);
      if (cycleCheck) {
        return NextResponse.json(
          { error: "Circular hierarchy detected" },
          { status: 400 }
        );
      }
    }
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.capabilities !== undefined) updateData.capabilities = data.capabilities;
    if (data.adapterType !== undefined) updateData.adapterType = data.adapterType;
    if (data.adapterConfig !== undefined) updateData.adapterConfig = data.adapterConfig as Prisma.InputJsonValue;
    if (data.reportsTo !== undefined) updateData.reportsTo = data.reportsTo;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.pauseReason !== undefined) updateData.pauseReason = data.pauseReason;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
      include: {
        _count: { select: { assignedStories: true, costEvents: true } },
      },
    });

    return NextResponse.json(agent);
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "An agent with this name already exists in the organization" },
        { status: 409 }
      );
    }
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, agentId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:agent");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, orgId },
  });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Soft-delete: set status to terminated
  await prisma.agent.update({
    where: { id: agentId },
    data: { status: "terminated" },
  });

  return NextResponse.json({ success: true });
}
