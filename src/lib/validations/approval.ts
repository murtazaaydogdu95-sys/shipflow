import { z } from "zod";

export const APPROVAL_TYPES = ["hire_agent", "budget_override"] as const;
export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
] as const;

export const createApprovalSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  payload: z.record(z.string(), z.unknown()),
});

export const decideApprovalSchema = z
  .object({
    status: z.enum(["approved", "rejected", "revision_requested"]),
    reason: z.string().max(2000).optional(),
  })
  .refine((data) => data.status === "approved" || !!data.reason, {
    message: "Reason is required for rejection or revision request",
    path: ["reason"],
  });

export const approvalCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
export type ApprovalCommentInput = z.infer<typeof approvalCommentSchema>;
