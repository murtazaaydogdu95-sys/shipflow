import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, resolvePlanFromPriceId } from "@/lib/paddle";

export async function POST(req: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Enforce body size limit (1MB) to prevent memory exhaustion
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > 1_048_576) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await req.text();
  if (rawBody.length > 1_048_576) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const signature = req.headers.get("paddle-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[billing-webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const eventType: string = body.event_type;
  const data = body.data;

  if (!eventType || !data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const customData = data.custom_data;
  console.log("[billing-webhook] Event:", eventType, "custom_data:", JSON.stringify(customData));

  const orgId: string | undefined = customData?.orgId || customData?.org_id;
  const userId: string | undefined = customData?.userId || customData?.user_id;
  const subscriptionId = data.id ? String(data.id) : "";
  const customerId = data.customer_id ? String(data.customer_id) : "";
  const status: string = data.status ?? "";

  // Resolve price ID from subscription items
  const priceId: string = data.items?.[0]?.price?.id ?? "";
  const resolvedPlan = priceId ? resolvePlanFromPriceId(priceId) : "PRO";

  // Resolve org: try custom_data first, then existing subscription, then userId, then customer email
  let resolvedOrgId = orgId;

  if (!resolvedOrgId && subscriptionId) {
    const existing = await prisma.subscription.findUnique({
      where: { externalSubscriptionId: subscriptionId },
      select: { orgId: true },
    });
    resolvedOrgId = existing?.orgId ?? undefined;
  }

  if (!resolvedOrgId && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentOrgId: true },
    });
    resolvedOrgId = user?.currentOrgId ?? undefined;
  }

  if (!resolvedOrgId && customerId) {
    const org = await prisma.organization.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    resolvedOrgId = org?.id ?? undefined;
  }

  switch (eventType) {
    case "subscription.created": {
      if (!resolvedOrgId) {
        console.warn("[billing-webhook] No orgId in subscription.created");
        return NextResponse.json({ received: true });
      }

      const nextBilledAt = data.next_billed_at
        ? new Date(data.next_billed_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { orgId: resolvedOrgId },
        create: {
          orgId: resolvedOrgId,
          externalSubscriptionId: subscriptionId,
          productId: priceId,
          currentPeriodEnd: nextBilledAt,
          status: "active",
        },
        update: {
          externalSubscriptionId: subscriptionId,
          productId: priceId,
          currentPeriodEnd: nextBilledAt,
          status: "active",
        },
      });

      await prisma.organization.update({
        where: { id: resolvedOrgId },
        data: {
          plan: resolvedPlan,
          ...(customerId ? { paddleCustomerId: customerId } : {}),
        },
      });
      break;
    }

    case "subscription.updated": {
      if (!resolvedOrgId) break;

      const nextBilledAt = data.next_billed_at
        ? new Date(data.next_billed_at)
        : undefined;

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: {
          status,
          ...(nextBilledAt ? { currentPeriodEnd: nextBilledAt } : {}),
        },
      });

      // If status is active, sync plan from price ID
      if (status === "active") {
        await prisma.organization.update({
          where: { id: resolvedOrgId },
          data: { plan: resolvedPlan },
        });
      }
      break;
    }

    case "subscription.canceled": {
      if (!resolvedOrgId) break;

      await prisma.subscription.deleteMany({
        where: { orgId: resolvedOrgId },
      });

      await prisma.organization.update({
        where: { id: resolvedOrgId },
        data: { plan: "FREE" },
      });
      break;
    }

    case "transaction.completed": {
      if (!resolvedOrgId) break;

      // Update currentPeriodEnd from billing period
      const billingPeriodEnd = data.billing_period?.ends_at;
      if (billingPeriodEnd) {
        await prisma.subscription.updateMany({
          where: { orgId: resolvedOrgId },
          data: {
            currentPeriodEnd: new Date(billingPeriodEnd),
            status: "active",
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
