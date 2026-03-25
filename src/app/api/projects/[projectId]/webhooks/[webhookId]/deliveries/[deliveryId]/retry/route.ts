import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { attemptDelivery } from "@/lib/webhooks";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string; deliveryId: string }> }
) {
  const { projectId, webhookId, deliveryId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return unauthorizedResponse();

  // Verify webhook belongs to project
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, projectId },
    select: { id: true },
  });
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  // Verify delivery belongs to webhook and is in a retryable state
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, webhookId },
    select: { id: true, status: true, maxAttempts: true },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  if (delivery.status !== "DEAD_LETTER" && delivery.status !== "FAILED") {
    return NextResponse.json(
      { error: `Cannot retry delivery with status "${delivery.status}"` },
      { status: 422 }
    );
  }

  // Reset delivery for retry
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "PENDING",
      attempts: 0,
      nextRetryAt: new Date(),
      errorMessage: null,
    },
  });

  // Attempt delivery immediately (fire-and-forget)
  attemptDelivery(deliveryId).catch((err) => {
    console.error(`[webhook-retry] Manual retry failed for ${deliveryId}:`, err instanceof Error ? err.message : err);
  });

  return NextResponse.json({ success: true, message: "Delivery queued for retry" });
}
