import {
  lemonSqueezySetup,
  createCheckout as lsCreateCheckout,
  getSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import { createHmac, timingSafeEqual } from "crypto";

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_PRO_VARIANT_ID = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;

if (LEMONSQUEEZY_API_KEY) {
  lemonSqueezySetup({ apiKey: LEMONSQUEEZY_API_KEY });
}

export const lemonSqueezyEnabled = !!LEMONSQUEEZY_API_KEY;

export const PLAN_LIMITS = {
  FREE: {
    maxProjects: 3,
    maxStoriesPerProject: 50,
    maxAIRewritesPerDay: 5,
    aiModel: "claude-haiku-4-5-20250414",
  },
  PRO: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxAIRewritesPerDay: 50,
    aiModel: "claude-sonnet-4-20250514",
  },
} as const;

export async function createCheckout(
  orgId: string,
  userId: string,
  email: string
): Promise<string | null> {
  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID || !LEMONSQUEEZY_PRO_VARIANT_ID) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await lsCreateCheckout(LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_PRO_VARIANT_ID, {
    checkoutData: {
      email,
      custom: {
        org_id: orgId,
        user_id: userId,
      },
    },
    productOptions: {
      redirectUrl: `${appUrl}/billing?success=true`,
    },
  });

  if (error) {
    console.error("[lemonsqueezy] Checkout creation failed:", error.message);
    return null;
  }

  return data?.data?.attributes?.url ?? null;
}

export async function getCustomerPortalUrl(
  subscriptionId: string
): Promise<string | null> {
  if (!LEMONSQUEEZY_API_KEY) return null;

  const { data, error } = await getSubscription(subscriptionId);

  if (error) {
    console.error("[lemonsqueezy] Failed to get subscription:", error.message);
    return null;
  }

  return data?.data?.attributes?.urls?.customer_portal ?? null;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;

  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature);
  const hmacBuf = Buffer.from(hmac);

  if (sigBuf.length !== hmacBuf.length) return false;
  return timingSafeEqual(sigBuf, hmacBuf);
}
