import { z } from "zod";

export const savedFilterSchema = z.object({
  name: z.string().min(1).max(50),
  filters: z.object({
    search: z.string().optional(),
    priorities: z.array(z.string()).optional(),
    types: z.array(z.string()).optional(),
    labelIds: z.array(z.string()).optional(),
    assigneeIds: z.array(z.string()).optional(),
  }),
  isDefault: z.boolean().optional(),
});

export type SavedFilterInput = z.infer<typeof savedFilterSchema>;
