import { z } from "zod";

/**
 * Validate a cron expression string (5-field standard cron).
 * Uses cron-parser for thorough validation.
 */
function isValidCron(expr: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CronExpressionParser } = require("cron-parser");
    CronExpressionParser.parse(expr);
    return true;
  } catch {
    return false;
  }
}

export const storyTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional().default("chore"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().default("MEDIUM"),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  labels: z.array(z.string()).optional(),
});

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  storyTemplate: storyTemplateSchema,
  cronExpression: z.string().min(1).max(100).refine(isValidCron, {
    message: "Invalid cron expression. Use standard 5-field format (e.g. '0 9 * * 1-5').",
  }),
  timezone: z.string().min(1).max(100).default("UTC"),
  concurrencyPolicy: z.enum(["always_enqueue", "skip_if_active", "coalesce_if_active"]).default("skip_if_active"),
  webhookEnabled: z.boolean().optional().default(false),
  webhookAuthType: z.enum(["hmac", "bearer", "none"]).optional().default("none"),
  active: z.boolean().optional().default(true),
});

export const updateRoutineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  storyTemplate: storyTemplateSchema.optional(),
  cronExpression: z.string().min(1).max(100).refine(isValidCron, {
    message: "Invalid cron expression. Use standard 5-field format (e.g. '0 9 * * 1-5').",
  }).optional(),
  timezone: z.string().min(1).max(100).optional(),
  concurrencyPolicy: z.enum(["always_enqueue", "skip_if_active", "coalesce_if_active"]).optional(),
  webhookEnabled: z.boolean().optional(),
  webhookAuthType: z.enum(["hmac", "bearer", "none"]).optional(),
  active: z.boolean().optional(),
});

export type CreateRoutineInput = z.infer<typeof createRoutineSchema>;
export type UpdateRoutineInput = z.infer<typeof updateRoutineSchema>;
export type StoryTemplate = z.infer<typeof storyTemplateSchema>;
