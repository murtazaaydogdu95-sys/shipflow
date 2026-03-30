import { prisma } from "@/lib/prisma";

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
}

/**
 * Returns the first day of the current month in UTC.
 */
export function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Compute current spend for a given policy by aggregating CostEvent records.
 */
async function computeCurrentSpend(policy: {
  orgId: string;
  scope: string;
  scopeId: string | null;
  window: string;
}): Promise<number> {
  const where: Record<string, unknown> = { orgId: policy.orgId };

  if (policy.scope === "agent" && policy.scopeId) {
    where.agentId = policy.scopeId;
  } else if (policy.scope === "project" && policy.scopeId) {
    where.projectId = policy.scopeId;
  }
  // For "org" scope, we just filter by orgId (already set)

  if (policy.window === "calendar_month") {
    where.createdAt = { gte: getMonthStart() };
  }
  // For "lifetime", no date filter needed

  const result = await prisma.costEvent.aggregate({
    where,
    _sum: { costCents: true },
  });

  return result._sum.costCents ?? 0;
}

/**
 * Check all active budget policies before allowing an agent invocation.
 * Returns whether the action is allowed and any warnings.
 */
export async function checkBudget(
  agentId: string,
  projectId: string,
  orgId: string
): Promise<BudgetCheckResult> {
  const policies = await prisma.budgetPolicy.findMany({
    where: {
      orgId,
      OR: [
        { scope: "org" },
        { scope: "agent", scopeId: agentId },
        { scope: "project", scopeId: projectId },
      ],
    },
  });

  if (policies.length === 0) {
    return { allowed: true, warnings: [] };
  }

  const warnings: string[] = [];

  for (const policy of policies) {
    const currentSpend = await computeCurrentSpend(policy);
    const percentUsed = (currentSpend / policy.amountCents) * 100;

    if (percentUsed >= 100 && policy.hardStopEnabled) {
      return {
        allowed: false,
        reason: `Budget exceeded for ${policy.scope} policy (${currentSpend}c / ${policy.amountCents}c). Hard stop is enabled.`,
        warnings,
      };
    }

    if (percentUsed >= policy.warnPercent) {
      warnings.push(
        `Budget warning: ${policy.scope} policy at ${percentUsed.toFixed(1)}% (${currentSpend}c / ${policy.amountCents}c)`
      );
    }
  }

  return { allowed: true, warnings };
}

/**
 * Called after a CostEvent is recorded to check if any thresholds have been crossed.
 * Creates BudgetIncident records and optionally pauses agents on hard stop.
 */
export async function checkBudgetAfterCost(
  orgId: string,
  agentId?: string,
  projectId?: string
): Promise<void> {
  const orClauses: Array<Record<string, unknown>> = [{ scope: "org" }];
  if (agentId) {
    orClauses.push({ scope: "agent", scopeId: agentId });
  }
  if (projectId) {
    orClauses.push({ scope: "project", scopeId: projectId });
  }

  const policies = await prisma.budgetPolicy.findMany({
    where: {
      orgId,
      OR: orClauses,
    },
    include: {
      incidents: {
        where: { resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  for (const policy of policies) {
    const currentSpend = await computeCurrentSpend(policy);
    const percentUsed = (currentSpend / policy.amountCents) * 100;

    // Check if hard stop threshold crossed (100%+)
    if (percentUsed >= 100 && policy.hardStopEnabled) {
      const hasUnresolvedHardStop = policy.incidents.some(
        (i) => i.type === "hard_stop"
      );

      if (!hasUnresolvedHardStop) {
        await prisma.budgetIncident.create({
          data: {
            policyId: policy.id,
            type: "hard_stop",
            currentCents: currentSpend,
            limitCents: policy.amountCents,
          },
        });

        // Auto-pause the agent if this is an agent-scoped policy
        if (policy.scope === "agent" && policy.scopeId) {
          await prisma.agent.updateMany({
            where: {
              id: policy.scopeId,
              orgId,
              status: { in: ["idle", "running"] },
            },
            data: {
              status: "paused",
              pauseReason: "Budget hard stop triggered",
            },
          });
        }
      }
    }
    // Check if warning threshold crossed
    else if (percentUsed >= policy.warnPercent && policy.notifyEnabled) {
      const hasUnresolvedWarning = policy.incidents.some(
        (i) => i.type === "soft_warning"
      );

      if (!hasUnresolvedWarning) {
        await prisma.budgetIncident.create({
          data: {
            policyId: policy.id,
            type: "soft_warning",
            currentCents: currentSpend,
            limitCents: policy.amountCents,
          },
        });
      }
    }
  }
}

/**
 * Compute current spend for a policy (exported for API use).
 */
export { computeCurrentSpend };
