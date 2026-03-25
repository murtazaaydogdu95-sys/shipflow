import { z } from "zod";

const wipLimitValue = z.number().int().min(1).max(100).nullable();

const wipLimitsSchema = z
  .record(
    z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
    wipLimitValue
  )
  .optional()
  .nullable();

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  techStack: z.string().max(200).optional(),
  githubRepo: z.string().url().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  isPublic: z.boolean().optional(),
  agentAutoAssign: z.boolean().optional(),
  agentMinPriority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  agentWorkingDir: z.string().optional().nullable(),
  aiProvider: z.enum(["anthropic", "openai", "ollama"]).optional(),
  aiApiKey: z.string().max(200).optional().nullable(),
  maxConcurrentAgents: z.number().int().min(1).max(3).optional(),
  wipLimits: wipLimitsSchema,
  deployProvider: z.enum(["vercel", "railway", "fly", "custom"]).optional().nullable(),
  deployToken: z.string().max(500).optional().nullable(),
  deployProjectId: z.string().max(200).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
