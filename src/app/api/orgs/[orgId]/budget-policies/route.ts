import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { createBudgetPolicySchema } from "@/lib/validations/budget";
import { computeCurrentSpend, getMonthStart } from "@/lib/budget-check";
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

  const role = await checkOrgPermission(session.user.id, orgId, "org:budget");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const policies = await prisma.budgetPolicy.findMany({
      where: { orgId },
      include: {
        incidents: {
          where: { resolvedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute current spend for each policy
    const policiesWithSpend = await Promise.all(
      policies.map(async (policy) => {
        const currentSpendCents = await computeCurrentSpend(policy);
        const percentUsed =
          policy.amountCents > 0
            ? Math.round((currentSpendCents / policy.amountCents) * 100)
            : 0;
        return {
          ...policy,
          currentSpendCents,
          percentUsed,
          status:
            percentUsed >= 100
              ? "exceeded"
              : percentUsed >= policy.warnPercent
                ? "warning"
                : "ok",
        };
      })
    );

    return NextResponse.json(policiesWithSpend);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const role = await checkOrgPermission(session.user.id, orgId, "org:budget");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = createBudgetPolicySchema.parse(parsed.data);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return NextResponse.json(
        { error: `Validation failed: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    throw err;
  }

  // Validate scopeId references exist in the org
  if (data.scope === "agent" && data.scopeId) {
    const agent = await prisma.agent.findFirst({
      where: { id: data.scopeId, orgId },
    });
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found in this organization" },
        { status: 400 }
      );
    }
  } else if (data.scope === "project" && data.scopeId) {
    const project = await prisma.project.findFirst({
      where: { id: data.scopeId, orgId },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found in this organization" },
        { status: 400 }
      );
    }
  }

  // Check for duplicate policy (same scope + scopeId + window)
  const existing = await prisma.budgetPolicy.findFirst({
    where: {
      orgId,
      scope: data.scope,
      scopeId: data.scopeId ?? null,
      window: data.window,
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "A budget policy with this scope, target, and window already exists",
      },
      { status: 409 }
    );
  }

  try {
    const policy = await prisma.budgetPolicy.create({
      data: {
        orgId,
        scope: data.scope,
        scopeId: data.scopeId ?? null,
        metric: data.metric,
        window: data.window,
        amountCents: data.amountCents,
        warnPercent: data.warnPercent,
        hardStopEnabled: data.hardStopEnabled,
        notifyEnabled: data.notifyEnabled,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
