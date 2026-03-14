import { z } from "zod";

export const createRecurringStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
});

export const updateRecurringStorySchema = createRecurringStorySchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateRecurringStoryInput = z.infer<typeof createRecurringStorySchema>;
export type UpdateRecurringStoryInput = z.infer<typeof updateRecurringStorySchema>;
