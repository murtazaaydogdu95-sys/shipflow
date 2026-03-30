import { z } from "zod";

export const createWorkspaceSchema = z.object({
  agentId: z.string().optional().nullable(),
  workingDir: z.string().min(1).max(500),
  branchName: z
    .string()
    .regex(/^[a-zA-Z0-9\/_.\-]+$/, "Invalid branch name characters")
    .optional()
    .nullable(),
  cloneUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateWorkspaceSchema = z.object({
  status: z.enum(["active", "closed"]).optional(),
  branchName: z
    .string()
    .regex(/^[a-zA-Z0-9\/_.\-]+$/, "Invalid branch name characters")
    .optional()
    .nullable(),
  closedAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
