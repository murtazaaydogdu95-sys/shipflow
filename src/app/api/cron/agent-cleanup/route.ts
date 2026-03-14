import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AGENT_TIMEOUT_MS } from "@/lib/agent-trigger";
import { timingSafeEqual } from "crypto";

export async function POST(req: Request) {
  // Verify: Bearer token OR Vercel cron header (only trust on actual Vercel deployments)
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const vercelCron = req.headers.get("x-vercel-cron");
  const isVercel = !!process.env.VERCEL;
  if (!(isVercel && vercelCron)) {
    const expected = process.env.CRON_SECRET || "";
    const provided = secret || "";
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (!expected || expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - AGENT_TIMEOUT_MS);

  // Find stuck agents (RUNNING for longer than timeout)
  const stuckStories = await prisma.story.findMany({
    where: {
      agentStatus: "RUNNING",
      agentTriggeredAt: { lt: cutoff },
    },
    select: { id: true, shortId: true, projectId: true },
  });

  for (const story of stuckStories) {
    await prisma.story.update({
      where: { id: story.id },
      data: { agentStatus: "FAILED" },
    });

    await prisma.activity.create({
      data: {
        type: "AGENT_TIMEOUT",
        message: `Agent timed out for ${story.shortId} (exceeded ${AGENT_TIMEOUT_MS / 60000} min)`,
        projectId: story.projectId,
        storyId: story.id,
      },
    });

    console.log(`[agent-cleanup] Marked ${story.shortId} as FAILED (timeout)`);
  }

  return NextResponse.json({ success: true, cleaned: stuckStories.length });
}
