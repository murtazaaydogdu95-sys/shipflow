import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { updateBudgetPolicySchema } from "@/lib/validations/budget";
import { computeCurrentSpend } from "@/lib/budget-check";
import { ZodError } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; policyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, policyId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:budget");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const policy = await prisma.budgetPolicy.findFirst({
      where: { id: policyId, orgId },
      include: {
        incidents: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Budget policy not found" },
        { status: 404 }
      );
    }

    const currentSpendCents = await computeCurrentSpend(policy);
    const percentUsed =
      policy.amountCents > 0
        ? Math.round((currentSpendCents / policy.amountCents) * 100)
        : 0;

    return NextResponse.json({
      ...policy,
      currentSpendCents,
      percentUsed,
      status:
        percentUsed >= 100
          ? "exceeded"
          : percentUsed >= policy.warnPercent
            ? "warning"
            : "ok",
    });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; policyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, policyId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:budget");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = updateBudgetPolicySchema.parse(parsed.data);
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

  const existing = await prisma.budgetPolicy.findFirst({
    where: { id: policyId, orgId },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Budget policy not found" },
      { status: 404 }
    );
  }

  try {
    const policy = await prisma.budgetPolicy.update({
      where: { id: policyId },
      data,
    });

    // If the limit was increased, resolve unresolved hard_stop incidents
    // and resume paused agents
    if (
      data.amountCents &&
      data.amountCents > existing.amountCents
    ) {
      const currentSpend = await computeCurrentSpend(policy);
      if (currentSpend < data.amountCents) {
        await prisma.budgetIncident.updateMany({
          where: {
            policyId,
            type: "hard_stop",
            resolvedAt: null,
          },
          data: { resolvedAt: new Date() },
        });

        // Resume agents paused by this policy
        if (existing.scope === "agent" && existing.scopeId) {
          await prisma.agent.updateMany({
            where: {
              id: existing.scopeId,
              orgId,
              status: "paused",
              pauseReason: "Budget hard stop triggered",
            },
            data: { status: "idle", pauseReason: null },
          });
        }
      }
    }

    return NextResponse.json(policy);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string; policyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, policyId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:budget");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.budgetPolicy.findFirst({
    where: { id: policyId, orgId },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Budget policy not found" },
      { status: 404 }
    );
  }

  try {
    await prisma.budgetPolicy.delete({
      where: { id: policyId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
