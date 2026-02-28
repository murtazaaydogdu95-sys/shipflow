import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { triggerClaudeAgent } from "@/lib/agent-trigger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, storyId } = await params;

  if (authResult.type === "apikey" && authResult.projectId !== projectId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const feedback = body?.feedback as string | undefined;

  try {
    await triggerClaudeAgent({ storyId, projectId, force: true, feedback });
    return NextResponse.json({ triggered: true, message: "Agent triggered successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ triggered: false, message }, { status: 500 });
  }
}
