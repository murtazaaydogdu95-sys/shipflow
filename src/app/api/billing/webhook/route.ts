import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, resolvePlanFromVariantId } from "@/lib/lemonsqueezy";

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
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

  const signature = req.headers.get("x-signature") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[billing-webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const eventName: string = body.meta?.event_name || "";
  const data = body.data;

  if (!eventName || !data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const customData = body.meta?.custom_data;
  console.log("[billing-webhook] Event:", eventName, "custom_data:", JSON.stringify(customData));

  const orgId: string | undefined = customData?.org_id;
  const subscriptionId = data.id ? String(data.id) : "";
  const customerId = data.attributes?.customer_id ? String(data.attributes.customer_id) : "";
  const status: string = data.attributes?.status ?? "";

  // Resolve variant ID from subscription data
  const variantId: string = data.attributes?.variant_id ? String(data.attributes.variant_id) : "";
  const resolvedPlan = variantId ? resolvePlanFromVariantId(variantId) : "PRO";

  // Resolve org: try custom_data first, then existing subscription, then customer ID
  let resolvedOrgId = orgId;

  if (!resolvedOrgId && subscriptionId) {
    const existing = await prisma.subscription.findUnique({
      where: { externalSubscriptionId: subscriptionId },
      select: { orgId: true },
    });
    resolvedOrgId = existing?.orgId ?? undefined;
  }

  if (!resolvedOrgId && customerId) {
    const org = await prisma.organization.findFirst({
      where: { paddleCustomerId: customerId },
      select: { id: true },
    });
    resolvedOrgId = org?.id ?? undefined;
  }

  switch (eventName) {
    case "subscription_created": {
      if (!resolvedOrgId) {
        console.warn("[billing-webhook] No orgId in subscription_created");
        return NextResponse.json({ received: true });
      }

      const renewsAt = data.attributes?.renews_at
        ? new Date(data.attributes.renews_at)
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

      await prisma.organization.update({
        where: { id: resolvedOrgId },
        data: {
          plan: resolvedPlan,
          ...(customerId ? { paddleCustomerId: customerId } : {}),
        },
      });
      break;
    }

    case "subscription_updated": {
      if (!resolvedOrgId) break;

      const renewsAt = data.attributes?.renews_at
        ? new Date(data.attributes.renews_at)
        : undefined;

      await prisma.subscription.updateMany({
        where: { orgId: resolvedOrgId },
        data: {
          status,
          ...(variantId ? { productId: variantId } : {}),
          ...(renewsAt ? { currentPeriodEnd: renewsAt } : {}),
        },
      });

      // If status is active, sync plan from variant ID
      if (status === "active") {
        await prisma.organization.update({
          where: { id: resolvedOrgId },
          data: { plan: resolvedPlan },
        });
      }
      break;
    }

    case "subscription_cancelled": {
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

    case "subscription_payment_success": {
      if (!resolvedOrgId) break;

      // Update currentPeriodEnd from renewal date
      const renewsAt = data.attributes?.renews_at;
      if (renewsAt) {
        await prisma.subscription.updateMany({
          where: { orgId: resolvedOrgId },
          data: {
            currentPeriodEnd: new Date(renewsAt),
            status: "active",
          },
        });
      }

      console.log("[billing-webhook] Payment success for org:", resolvedOrgId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
