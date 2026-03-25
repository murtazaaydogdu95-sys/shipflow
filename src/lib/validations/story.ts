import { z } from "zod";

const storyStatusEnum = z.enum(["ICEBOX", "BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);

export const createStorySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  rawInput: z.string().optional(),
  userStory: z.string().optional(),
  status: storyStatusEnum.optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
  sprintId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
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
  branchName: z.string().regex(/^[a-zA-Z0-9\/_.\-]+$/, "Invalid branch name characters").optional().nullable(),
  // previewPort and previewPid are intentionally excluded — they are set only
  // by the preview-manager internally, never by external API callers.
});

export const moveStorySchema = z.object({
  status: storyStatusEnum,
  position: z.number().int().min(0),
});

export const rewriteStorySchema = z.object({
  rawInput: z.string().min(1).max(5000),
  techStack: z.string().optional(),
});

export const importStorySchema = z.object({
  format: z.enum(["csv", "json"]),
  data: z.string().min(1).max(1_048_576), // 1MB max
});

export const importStoryRowSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  status: storyStatusEnum.optional().nullable(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().nullable(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional().nullable(),
  storyPoints: z.number().int().min(0).max(100).optional().nullable(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type MoveStoryInput = z.infer<typeof moveStorySchema>;
export type RewriteStoryInput = z.infer<typeof rewriteStorySchema>;
export type ImportStoryInput = z.infer<typeof importStorySchema>;
export type ImportStoryRow = z.infer<typeof importStoryRowSchema>;
