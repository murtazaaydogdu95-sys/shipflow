import { createHmac, timingSafeEqual } from "crypto";

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;

export const lemonSqueezyEnabled = !!LEMONSQUEEZY_API_KEY;

export const PLAN_LIMITS = {
  FREE: {
    maxProjects: 3,
    maxStoriesPerProject: 15,
    maxAIRewritesPerMonth: 15,
    aiModel: "claude-haiku-4-5-20250414",
    maxConcurrentAgents: 1,
    priorityQueue: false,
  },
  PRO: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxAIRewritesPerMonth: 50,
    aiModel: "claude-sonnet-4-20250514",
    maxConcurrentAgents: 3,
    priorityQueue: false,
  },
  PRO_MAX: {
    maxProjects: Infinity,
    maxStoriesPerProject: Infinity,
    maxAIRewritesPerMonth: Infinity,
    aiModel: "claude-sonnet-4-20250514",
    maxConcurrentAgents: 5,
    priorityQueue: true,
  },
} as const;

/** Lemon Squeezy variant IDs configured in the LS dashboard */
export const LS_VARIANT_IDS: Record<string, string> = {
  PRO: process.env.LEMONSQUEEZY_PRO_VARIANT_ID || "",
  PRO_MAX: process.env.LEMONSQUEEZY_VARIANT_ID_PRO_MAX || "",
};

export async function createCheckout(params: {
  variantId: string;
  orgId: string;
  orgName: string;
  userEmail: string;
}): Promise<string> {
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.userEmail,
            custom: {
              org_id: params.orgId,
            },
          },
          ...(process.env.NEXTAUTH_URL?.startsWith("https://") ? {
            product_options: {
              redirect_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
            },
          } : {}),
        },
        relationships: {
          store: {
            data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID },
          },
          variant: {
            data: { type: "variants", id: params.variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lemon Squeezy checkout failed: ${err}`);
  }

  const data = await res.json();
  return data.data.attributes.url;
}

export async function getCustomerPortalUrl(
  subscriptionId: string
): Promise<string | null> {
  if (!LEMONSQUEEZY_API_KEY) return null;

  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    if (!res.ok) {
      console.error("[lemonsqueezy] Failed to fetch subscription:", res.status);
      return null;
    }

    const data = await res.json();
    return data.data.attributes.urls.customer_portal ?? null;
  } catch (err) {
    console.error("[lemonsqueezy] Failed to get subscription portal URL:", err);
    return null;
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");

  const sigBuf = Buffer.from(signature);
  const hmacBuf = Buffer.from(hmac);

  if (sigBuf.length !== hmacBuf.length) return false;
  return timingSafeEqual(sigBuf, hmacBuf);
}

export function resolvePlanFromVariantId(variantId: string): "PRO" | "PRO_MAX" {
  const proMaxVariantId = process.env.LEMONSQUEEZY_VARIANT_ID_PRO_MAX;
  if (proMaxVariantId && variantId === proMaxVariantId) return "PRO_MAX";
  return "PRO";
}
