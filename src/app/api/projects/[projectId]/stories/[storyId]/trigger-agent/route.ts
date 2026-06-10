import { NextResponse } from "next/server";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { triggerClaudeAgent } from "@/lib/agent-trigger";
import { sanitizeError, parseJsonBody } from "@/lib/api-error";
import { agentRunRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Abuse guard: cap agent triggers per project (multi-tenant runaway protection).
  const rl = await agentRunRateLimit.check(`agent:${projectId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { triggered: false, error: "Too many agent runs — slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } }
    );
  }

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await parseJsonBody(req, 64_000).catch(() => ({ ok: true as const, data: {} }));
  const body = parsed.ok ? parsed.data as Record<string, unknown> : {};
  const feedback = body?.feedback as string | undefined;

  try {
    const result = await triggerClaudeAgent({ storyId, projectId, force: true, feedback });
    if (!result.triggered) {
      return NextResponse.json({ triggered: false, error: result.reason }, { status: 422 });
    }
    return NextResponse.json({ triggered: true, message: "Agent triggered successfully" });
  } catch (error) {
    sanitizeError(error, "Agent trigger failed");
    return NextResponse.json({ triggered: false, error: "Agent trigger failed" }, { status: 500 });
  }
}
