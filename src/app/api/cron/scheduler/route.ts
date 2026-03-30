import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/adapters/registry";
import { checkBudget } from "@/lib/budget-check";
import { timingSafeEqual } from "crypto";
import { CronExpressionParser } from "cron-parser";

/**
 * Heartbeat scheduler cron job.
 * Finds agents with heartbeatEnabled=true, status="idle", nextHeartbeatAt <= now().
 * For each: creates a HeartbeatRun, invokes via the agent's adapter, records the result.
 * Updates nextHeartbeatAt based on the agent's cron expression.
 */
export async function GET(req: Request) {
  // Verify: Bearer token OR Vercel cron header
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const vercelCron = req.headers.get("x-vercel-cron");
  const isVercel = !!process.env.VERCEL;

  if (!(isVercel && vercelCron)) {
    const expected = process.env.CRON_SECRET || "";
    const provided = secret || "";
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (
      !expected ||
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Find agents due for a heartbeat
  const dueAgents = await prisma.agent.findMany({
    where: {
      heartbeatEnabled: true,
      status: "idle",
      nextHeartbeatAt: { lte: now },
    },
    select: {
      id: true,
      name: true,
      adapterType: true,
      adapterConfig: true,
      heartbeatCron: true,
      orgId: true,
    },
    take: 10, // Process at most 10 per cron tick to avoid timeouts
  });

  const results: Array<{ agentId: string; name: string; status: string }> = [];

  for (const agent of dueAgents) {
    let run;
    try {
      // Create HeartbeatRun record
      run = await prisma.heartbeatRun.create({
        data: {
          agentId: agent.id,
          source: "scheduled",
          status: "running",
          startedAt: now,
        },
      });

      // Mark agent as running during heartbeat
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: "running", lastHeartbeatAt: now },
      });

      // Check budget before invoking adapter
      const budgetResult = await checkBudget(agent.id, "", agent.orgId);
      if (!budgetResult.allowed) {
        await prisma.heartbeatRun.update({
          where: { id: run.id },
          data: { status: "failed", finishedAt: new Date(), errorMessage: budgetResult.reason || "Budget exceeded" },
        });
        await prisma.agent.update({
          where: { id: agent.id },
          data: { status: "idle" },
        });
        results.push({ agentId: agent.id, name: agent.name, status: "budget_blocked" });
        continue;
      }

      // Build a lightweight heartbeat prompt
      const prompt = [
        `Heartbeat check for agent "${agent.name}".`,
        "Review the project for any pending stories or issues that need attention.",
        "If there are pending stories in the queue, report them.",
        "This is an automated health check — be concise.",
      ].join("\n");

      // Invoke the adapter
      const adapter = getAdapter(agent.adapterType);
      const result = await adapter.invoke({
        prompt,
        agent: { id: agent.id, adapterConfig: agent.adapterConfig, name: agent.name },
        story: { id: "", shortId: "heartbeat", title: "Heartbeat Check" },
        project: { id: "", agentWorkingDir: "", apiKey: "" },
        workingDir: process.cwd(),
        mcpConfigPath: "",
      });

      // Update HeartbeatRun with result
      await prisma.heartbeatRun.update({
        where: { id: run.id },
        data: {
          status: result.success ? "succeeded" : "failed",
          finishedAt: new Date(),
          exitCode: result.exitCode,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costCents: result.costCents,
          errorMessage: result.error,
        },
      });

      // Reset agent to idle
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: "idle" },
      });

      results.push({
        agentId: agent.id,
        name: agent.name,
        status: result.success ? "succeeded" : "failed",
      });
    } catch (err) {
      console.error(`[scheduler] Heartbeat failed for agent ${agent.name}:`, err);

      // Update run as failed if it was created
      if (run) {
        await prisma.heartbeatRun
          .update({
            where: { id: run.id },
            data: {
              status: "failed",
              finishedAt: new Date(),
              errorMessage: err instanceof Error ? err.message : String(err),
            },
          })
          .catch(console.error);
      }

      // Reset agent to idle
      await prisma.agent
        .update({ where: { id: agent.id }, data: { status: "idle" } })
        .catch(console.error);

      results.push({ agentId: agent.id, name: agent.name, status: "failed" });
    }

    // Compute next heartbeat time from cron expression
    if (agent.heartbeatCron) {
      try {
        const interval = CronExpressionParser.parse(agent.heartbeatCron);
        const next = interval.next().toDate();
        await prisma.agent.update({
          where: { id: agent.id },
          data: { nextHeartbeatAt: next },
        });
      } catch (cronErr) {
        console.error(
          `[scheduler] Invalid cron expression for agent ${agent.name}: ${agent.heartbeatCron}`,
          cronErr
        );
        // Disable heartbeat if cron is invalid
        await prisma.agent
          .update({
            where: { id: agent.id },
            data: { heartbeatEnabled: false, nextHeartbeatAt: null },
          })
          .catch(console.error);
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
