import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";

/**
 * GET /api/orgs/[orgId]/agents/[agentId]/heartbeats
 * List recent heartbeat runs for an agent (paginated, filterable by status).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, agentId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:read");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify agent belongs to org
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, orgId },
    select: { id: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const cursor = searchParams.get("cursor");

  const where: Record<string, unknown> = { agentId };
  if (status) {
    where.status = status;
  }

  const heartbeats = await prisma.heartbeatRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // Fetch one extra to determine if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      source: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      exitCode: true,
      inputTokens: true,
      outputTokens: true,
      costCents: true,
      storiesProcessed: true,
      errorMessage: true,
      createdAt: true,
      story: {
        select: { id: true, shortId: true, title: true },
      },
    },
  });

  const hasMore = heartbeats.length > limit;
  const items = hasMore ? heartbeats.slice(0, limit) : heartbeats;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return NextResponse.json({
    items,
    nextCursor,
  });
}
