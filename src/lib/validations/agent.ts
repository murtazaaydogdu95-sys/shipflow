import { z } from "zod";

export const AGENT_ROLES = ["coder", "tester", "reviewer", "architect", "qa", "devops", "designer", "pentester"] as const;
export const ADAPTER_TYPES = ["claude", "openai", "ollama"] as const;
export const AGENT_STATUSES = ["idle", "running", "paused", "terminated", "pending_approval"] as const;

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(AGENT_ROLES),
  title: z.string().max(200).optional(),
  icon: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  capabilities: z.string().max(1000).optional(),
  adapterType: z.enum(ADAPTER_TYPES).default("claude"),
  adapterConfig: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().max(5000).optional(),
    // BYOK credentials (encrypted at rest; never returned to the client).
    // apiKey: Anthropic/OpenAI key; oauthToken: Claude subscription token.
    apiKey: z.string().max(500).optional(),
    oauthToken: z.string().max(2000).optional(),
    baseUrl: z.string().url().max(500).optional(),
  }).optional(),
  reportsTo: z.string().cuid().optional(),
});

export const updateAgentSchema = createAgentSchema.partial().extend({
  status: z.enum(["idle", "paused", "terminated"]).optional(),
  pauseReason: z.string().max(200).optional().nullable(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
