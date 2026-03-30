import { z } from "zod";

export const BUDGET_SCOPES = ["org", "agent", "project"] as const;
export const BUDGET_WINDOWS = ["calendar_month", "lifetime"] as const;
export const BUDGET_METRICS = ["cost_cents"] as const;

export const createBudgetPolicySchema = z
  .object({
    scope: z.enum(BUDGET_SCOPES),
    scopeId: z.string().cuid().optional(),
    metric: z.enum(BUDGET_METRICS).default("cost_cents"),
    window: z.enum(BUDGET_WINDOWS).default("calendar_month"),
    amountCents: z.number().int().positive().max(100_000_00), // max $100,000
    warnPercent: z.number().int().min(1).max(99).default(80),
    hardStopEnabled: z.boolean().default(true),
    notifyEnabled: z.boolean().default(true),
  })
  .refine((data) => data.scope === "org" || !!data.scopeId, {
    message: "scopeId is required for agent and project scopes",
    path: ["scopeId"],
  });

export const updateBudgetPolicySchema = z.object({
  amountCents: z.number().int().positive().max(100_000_00).optional(),
  warnPercent: z.number().int().min(1).max(99).optional(),
  hardStopEnabled: z.boolean().optional(),
  notifyEnabled: z.boolean().optional(),
});

export type CreateBudgetPolicyInput = z.infer<typeof createBudgetPolicySchema>;
export type UpdateBudgetPolicyInput = z.infer<typeof updateBudgetPolicySchema>;
