import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { createAgentSchema } from "@/lib/validations/agent";
import { checkAgentLimit } from "@/lib/plan-limits";
import { createApproval } from "@/lib/approvals";
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
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { orgId };
  if (status) {
    where.status = status;
  }

  const agents = await prisma.agent.findMany({
    where,
    include: {
      _count: { select: { assignedStories: true, costEvents: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(agents);
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

  const role = await checkOrgPermission(session.user.id, orgId, "project:agent");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = createAgentSchema.parse(parsed.data);
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

  // Check plan limits for agent count
  const limitCheck = await checkAgentLimit(orgId);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message }, { status: 403 });
  }

  // Validate reportsTo references an agent in the same org
  if (data.reportsTo) {
    const parentAgent = await prisma.agent.findFirst({
      where: { id: data.reportsTo, orgId },
    });
    if (!parentAgent) {
      return NextResponse.json(
        { error: "reportsTo agent not found in this organization" },
        { status: 400 }
      );
    }
  }

  // Check if org requires approval for new agents
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { requireApprovalForAgents: true },
  });
  const requiresApproval = org?.requireApprovalForAgents ?? false;

  // Use serializable transaction to prevent plan limit bypass via concurrent requests
  try {
    const agent = await prisma.$transaction(async (tx) => {
      const count = await tx.agent.count({
        where: { orgId, status: { not: "terminated" } },
      });

      const orgData = await tx.organization.findUnique({
        where: { id: orgId },
        select: { plan: true },
      });

      const { PLAN_LIMITS } = await import("@/lib/paddle");
      const plan = (orgData?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
      const maxAgents = PLAN_LIMITS[plan]?.maxConcurrentAgents ?? PLAN_LIMITS.FREE.maxConcurrentAgents;

      if (count >= maxAgents) {
        throw new Error("AGENT_LIMIT_REACHED");
      }

      return tx.agent.create({
        data: {
          orgId,
          name: data.name,
          role: data.role,
          title: data.title,
          icon: data.icon,
          capabilities: data.capabilities,
          adapterType: data.adapterType,
          adapterConfig: data.adapterConfig ?? undefined,
          reportsTo: data.reportsTo,
          status: requiresApproval ? "pending_approval" : "idle",
        },
        include: {
          _count: { select: { assignedStories: true, costEvents: true } },
        },
      });
    }, { isolationLevel: "Serializable" });

    // Create approval request if required
    if (requiresApproval) {
      await createApproval({
        orgId,
        type: "hire_agent",
        payload: {
          agentId: agent.id,
          agentName: data.name,
          agentRole: data.role,
          agentConfig: data.adapterConfig ?? null,
        },
        requestedById: session.user.id,
      });
    }

    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "AGENT_LIMIT_REACHED") {
      return NextResponse.json(
        { error: "Agent limit reached for your plan. Upgrade for more agents." },
        { status: 403 }
      );
    }
    // Prisma unique constraint violation (duplicate name)
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
