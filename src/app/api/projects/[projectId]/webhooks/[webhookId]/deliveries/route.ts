import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const { projectId, webhookId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify webhook belongs to project
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, projectId },
    select: { id: true },
  });
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      webhookId,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      event: true,
      status: true,
      httpStatus: true,
      attempts: true,
      maxAttempts: true,
      errorMessage: true,
      lastAttemptAt: true,
      nextRetryAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(deliveries);
}
