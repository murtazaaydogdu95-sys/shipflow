import { prisma } from "@/lib/prisma";
import { checkBudgetAfterCost } from "@/lib/budget-check";

// Model pricing in cents per 1M tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 300, output: 1500 },
  "claude-haiku-4-5-20251001": { input: 80, output: 400 },
  "claude-opus-4-20250514": { input: 1500, output: 7500 },
  "claude-haiku-4-5-20250414": { input: 80, output: 400 },
  "gpt-4o": { input: 250, output: 1000 },
  "gpt-4o-mini": { input: 15, output: 60 },
  default: { input: 300, output: 1500 },
};

export function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
  return Math.ceil(
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}

export async function recordCostEvent(params: {
  agentId?: string;
  storyId?: string;
  projectId: string;
  orgId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const costCents = calculateCostCents(
    params.model,
    params.inputTokens,
    params.outputTokens
  );

  const { metadata, ...rest } = params;

  await prisma.$transaction([
    prisma.costEvent.create({
      data: {
        ...rest,
        costCents,
        metadata: metadata ?? undefined,
      },
    }),
    // Increment agent's running total if agentId provided
    ...(params.agentId
      ? [
          prisma.agent.update({
            where: { id: params.agentId },
            data: { totalCostCents: { increment: costCents } },
          }),
        ]
      : []),
  ]);

  // Check budget thresholds after recording cost
  await checkBudgetAfterCost(params.orgId, params.agentId, params.projectId);

  return costCents;
}

export function formatCostCents(cents: number): string {
  if (cents < 100) {
    return `${cents}c`;
  }
  return `$${(cents / 100).toFixed(2)}`;
}
