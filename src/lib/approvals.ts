import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALID_DECISION_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "revision_requested"],
  revision_requested: ["approved", "rejected"],
};

interface CreateApprovalParams {
  orgId: string;
  type: "hire_agent" | "budget_override";
  payload: Record<string, unknown>;
  requestedById: string;
}

interface DecideApprovalParams {
  approvalId: string;
  decision: "approved" | "rejected" | "revision_requested";
  decidedById: string;
  comment?: string;
}

/**
 * Create a new approval request.
 */
export async function createApproval(params: CreateApprovalParams) {
  const approval = await prisma.approval.create({
    data: {
      orgId: params.orgId,
      type: params.type,
      payload: params.payload as Prisma.InputJsonValue,
      requestedById: params.requestedById,
    },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return approval;
}

/**
 * Decide on an approval (approve, reject, or request revision).
 * Enforces four-eyes principle: requester cannot decide unless they are the sole
 * owner of a single-owner org.
 */
export async function decideApproval(params: DecideApprovalParams) {
  const approval = await prisma.approval.findUnique({
    where: { id: params.approvalId },
    include: {
      org: {
        include: {
          members: { where: { role: "OWNER" }, select: { userId: true } },
        },
      },
    },
  });

  if (!approval) {
    throw new Error("Approval not found");
  }

  // Validate status transition
  const allowed = VALID_DECISION_TRANSITIONS[approval.status] ?? [];
  if (!allowed.includes(params.decision)) {
    throw new Error(
      `Cannot transition from '${approval.status}' to '${params.decision}'`
    );
  }

  // Four-eyes principle: requester cannot decide unless single-owner org
  const orgOwners = approval.org.members;
  const isSingleOwner =
    orgOwners.length === 1 && orgOwners[0].userId === params.decidedById;
  if (
    approval.requestedById === params.decidedById &&
    !isSingleOwner
  ) {
    throw new Error(
      "Four-eyes policy: the requester cannot approve their own request"
    );
  }

  // Update approval
  await prisma.approval.update({
    where: { id: params.approvalId },
    data: {
      status: params.decision,
      decidedById: params.decidedById,
      decidedAt: new Date(),
    },
  });

  // Add comment if provided
  if (params.comment) {
    await prisma.approvalComment.create({
      data: {
        approvalId: params.approvalId,
        userId: params.decidedById,
        content: params.comment,
      },
    });
  }

  // Execute side effects
  if (params.decision === "approved") {
    await executeApprovalSideEffects(approval);
  }
}

/**
 * Execute side effects when an approval is approved.
 */
async function executeApprovalSideEffects(approval: {
  id: string;
  type: string;
  orgId: string;
  payload: unknown;
}) {
  const payload = approval.payload as Record<string, unknown>;

  if (approval.type === "hire_agent") {
    // Activate the agent that was pending approval
    const agentId = payload.agentId as string | undefined;
    if (agentId) {
      await prisma.agent.updateMany({
        where: {
          id: agentId,
          orgId: approval.orgId,
          status: "pending_approval",
        },
        data: { status: "idle" },
      });
    }
  } else if (approval.type === "budget_override") {
    const policyId = payload.policyId as string | undefined;
    const requestedAmountCents = payload.requestedAmountCents as
      | number
      | undefined;
    const incidentId = payload.incidentId as string | undefined;

    if (policyId && requestedAmountCents) {
      // Update the policy limit
      await prisma.budgetPolicy.update({
        where: { id: policyId },
        data: { amountCents: requestedAmountCents },
      });
    }

    // Resolve the related incident
    if (incidentId) {
      await prisma.budgetIncident.update({
        where: { id: incidentId },
        data: { resolvedAt: new Date(), approvalId: approval.id },
      });
    }

    // Resume any agents that were paused by this policy's hard stop
    if (policyId) {
      const policy = await prisma.budgetPolicy.findUnique({
        where: { id: policyId },
        select: { scope: true, scopeId: true, orgId: true },
      });
      if (policy?.scope === "agent" && policy.scopeId) {
        await prisma.agent.updateMany({
          where: {
            id: policy.scopeId,
            orgId: policy.orgId,
            status: "paused",
            pauseReason: "Budget hard stop triggered",
          },
          data: { status: "idle", pauseReason: null },
        });
      }
    }
  }
}
