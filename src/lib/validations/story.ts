import { z } from "zod";

export const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  rawInput: z.string().optional(),
  userStory: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  sprintId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
  acceptanceCriteria: z
    .array(
      z.object({
        given: z.string(),
        when: z.string(),
        then: z.string(),
      })
    )
    .optional(),
});

export const updateStorySchema = createStorySchema.partial().extend({
  agentStatus: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]).optional().nullable(),
  agentNotes: z.string().optional().nullable(),
  assignedToAgent: z.boolean().optional(),
  commitHash: z.string().optional().nullable(),
  branchName: z.string().optional().nullable(),
  previewPort: z.number().int().optional().nullable(),
  previewPid: z.number().int().optional().nullable(),
});

export const moveStorySchema = z.object({
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  position: z.number().int().min(0),
});

export const rewriteStorySchema = z.object({
  rawInput: z.string().min(1).max(5000),
  techStack: z.string().optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type MoveStoryInput = z.infer<typeof moveStorySchema>;
export type RewriteStoryInput = z.infer<typeof rewriteStorySchema>;
