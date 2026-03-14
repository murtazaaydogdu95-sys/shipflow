import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[billing-webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const eventName: string = body.meta?.event_name;
  const attributes = body.data?.attributes;
  const customData = body.meta?.custom_data;

  if (!eventName || !attributes) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log("[billing-webhook] Event:", eventName, "custom_data:", JSON.stringify(customData));

  const orgId: string | undefined = customData?.orgId || customData?.org_id;
  const userId: string | undefined = customData?.userId || customData?.user_id;
  const subscriptionId = String(body.data?.id ?? "");
  const variantId = String(attributes.variant_id ?? "");
  const status: string = attributes.status ?? "";
  const customerEmail: string | undefined = attributes.user_email;

  // For subscription_created we need orgId from custom_data
  // For other events, look up the org via the existing subscription record
  let resolvedOrgId = orgId;

  // Fallback 1: look up via existing subscription record
  if (!resolvedOrgId && subscriptionId) {
    const existing = await prisma.subscription.findUnique({
      where: { externalSubscriptionId: subscriptionId },
      select: { orgId: true },
    });
    resolvedOrgId = existing?.orgId ?? undefined;
  }

  // Fallback 2: resolve org from userId in custom_data
  if (!resolvedOrgId && userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentOrgId: true },
    });
    resolvedOrgId = user?.currentOrgId ?? undefined;
  }

  // Fallback 3: resolve org from customer email
  if (!resolvedOrgId && customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { currentOrgId: true },
    });
    resolvedOrgId = user?.currentOrgId ?? undefined;
  }

  switch (eventName) {
    case "subscription_created": {
      if (!resolvedOrgId) {
        console.warn("[billing-webhook] No orgId in subscription_created");
        return NextResponse.json({ received: true });
      }

      const renewsAt = attributes.renews_at
        ? new Date(attributes.renews_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { orgId: resolvedOrgId },
        create: {
          orgId: resolvedOrgId,
          externalSubscriptionId: subscriptionId,
          productId: variantId,
          currentPeriodEnd: renewsAt,
          status: "active",
        },
        update: {
          externalSubscriptionId: subscriptionId,
          productId: variantId,
          currentPeriodEnd: renewsAt,
          status: "active",
        },
      });

      const customerId = String(attributes.customer_id ?? "");
      await prisma.organization.update({
        where: { id: resolvedOrgId },
        data: {
          plan: "PRO",
          ...(customerId ? { lemonSqueezyCustomerId: customerId } : {}),
        },
      });
      break;
    }

    case "subscription_updated": {
      if (!resolvedOrgId) break;

      const renewsAt = attributes.renews_at
        ? new Date(attributes.renews_at)
        : undefined;

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: {
          status,
          ...(renewsAt ? { currentPeriodEnd: renewsAt } : {}),
        },
      });

      // If status is active, ensure org is PRO
      if (status === "active") {
        await prisma.organization.update({
          where: { id: resolvedOrgId },
          data: { plan: "PRO" },
        });
      }
      break;
    }

    case "subscription_payment_success": {
      if (!resolvedOrgId) break;

      const renewsAt = attributes.renews_at
        ? new Date(attributes.renews_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: {
          currentPeriodEnd: renewsAt,
          status: "active",
        },
      });
      break;
    }

    case "subscription_cancelled":
    case "subscription_expired": {
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

    case "subscription_resumed": {
      if (!resolvedOrgId) break;

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: { status: "active" },
      });

      await prisma.organization.update({
        where: { id: resolvedOrgId },
        data: { plan: "PRO" },
      });
      break;
    }

    case "subscription_payment_failed": {
      if (!resolvedOrgId) break;

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: { status: "past_due" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
