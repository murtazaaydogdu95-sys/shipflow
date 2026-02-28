import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  techStack: z.string().max(200).optional(),
  githubRepo: z.string().url().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  agentAutoAssign: z.boolean().optional(),
  agentMinPriority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  agentWorkingDir: z.string().optional().nullable(),
  aiProvider: z.enum(["anthropic", "openai", "ollama"]).optional(),
  aiApiKey: z.string().max(200).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
