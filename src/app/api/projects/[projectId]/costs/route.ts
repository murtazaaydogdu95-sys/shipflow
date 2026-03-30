import { NextRequest, NextResponse } from "next/server";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const access = await requireProjectAccess(req, projectId);
  if (!access) return forbiddenResponse();

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "30d";
  const agentId = url.searchParams.get("agentId");
  const storyId = url.searchParams.get("storyId");

  // Calculate date range
  const now = new Date();
  const daysMap: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const days = daysMap[period] ?? 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    projectId,
    createdAt: { gte: from },
  };
  if (agentId) {
    where.agentId = agentId;
  }
  if (storyId) {
    where.storyId = storyId;
  }

  // Run all aggregations in parallel
  const [totals, byAgent, byModel, events] = await Promise.all([
    prisma.costEvent.aggregate({
      where,
      _sum: {
        costCents: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: true,
    }),
    prisma.costEvent.groupBy({
      by: ["agentId"],
      where,
      _sum: { costCents: true, inputTokens: true, outputTokens: true },
    }),
    prisma.costEvent.groupBy({
      by: ["model"],
      where,
      _sum: { costCents: true, inputTokens: true, outputTokens: true },
    }),
    prisma.costEvent.findMany({
      where,
      select: {
        costCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Aggregate by day
  const byDayMap = new Map<string, number>();
  for (const event of events) {
    const dateKey = event.createdAt.toISOString().split("T")[0];
    byDayMap.set(dateKey, (byDayMap.get(dateKey) ?? 0) + event.costCents);
  }
  const byDay = Array.from(byDayMap.entries()).map(([date, costCents]) => ({
    date,
    costCents,
  }));

  // Resolve agent names for byAgent
  const agentIds = byAgent
    .map((a) => a.agentId)
    .filter((id): id is string => id !== null);
  const agents = agentIds.length > 0
    ? await prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true },
      })
    : [];
  const agentNameMap = new Map(agents.map((a) => [a.id, a.name]));

  return NextResponse.json({
    totalCostCents: totals._sum.costCents ?? 0,
    totalTokens:
      (totals._sum.inputTokens ?? 0) + (totals._sum.outputTokens ?? 0),
    totalInputTokens: totals._sum.inputTokens ?? 0,
    totalOutputTokens: totals._sum.outputTokens ?? 0,
    invocationCount: totals._count,
    byAgent: byAgent.map((a) => ({
      agentId: a.agentId,
      agentName: a.agentId ? agentNameMap.get(a.agentId) ?? "Unknown" : "Unassigned",
      costCents: a._sum.costCents ?? 0,
      tokenCount:
        (a._sum.inputTokens ?? 0) + (a._sum.outputTokens ?? 0),
    })),
    byModel: byModel.map((m) => ({
      model: m.model,
      costCents: m._sum.costCents ?? 0,
      tokenCount:
        (m._sum.inputTokens ?? 0) + (m._sum.outputTokens ?? 0),
    })),
    byDay,
    period: { from: from.toISOString(), to: now.toISOString() },
  });
}
