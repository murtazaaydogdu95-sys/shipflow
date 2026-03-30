import { z } from "zod";

export const GOAL_LEVELS = ["company", "team", "project"] as const;
export const GOAL_STATUSES = ["planned", "active", "completed"] as const;

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  level: z.enum(GOAL_LEVELS).default("project"),
  status: z.enum(GOAL_STATUSES).default("planned"),
  parentId: z.string().cuid().optional(),
  ownerAgentId: z.string().cuid().optional(),
});

export const updateGoalSchema = createGoalSchema.partial();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
