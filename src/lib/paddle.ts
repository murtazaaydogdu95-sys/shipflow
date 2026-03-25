import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { createHmac, timingSafeEqual } from "crypto";

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_ENVIRONMENT = (process.env.PADDLE_ENVIRONMENT || "sandbox") as "sandbox" | "production";

export const paddleEnabled = !!PADDLE_API_KEY;

export const paddle = PADDLE_API_KEY
  ? new Paddle(PADDLE_API_KEY, {
      environment: PADDLE_ENVIRONMENT === "production" ? Environment.production : Environment.sandbox,
    })
  : null;

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

export async function getCustomerPortalUrl(
  subscriptionId: string
): Promise<string | null> {
  if (!paddle) return null;

  try {
    const subscription = await paddle.subscriptions.get(subscriptionId);
    return subscription.managementUrls?.updatePaymentMethod ?? subscription.managementUrls?.cancel ?? null;
  } catch (err) {
    console.error("[paddle] Failed to get subscription portal URL:", err);
    return null;
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  paddleSignature: string
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;

  // Parse paddle-signature header: "ts=timestamp;h1=hash"
  const parts: Record<string, string> = {};
  for (const part of paddleSignature.split(";")) {
    const [key, ...vals] = part.split("=");
    if (key && vals.length) {
      parts[key.trim()] = vals.join("=").trim();
    }
  }

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // Verify HMAC-SHA256 of "timestamp:rawBody"
  const payload = `${ts}:${rawBody}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");

  const sigBuf = Buffer.from(h1);
  const hmacBuf = Buffer.from(hmac);

  if (sigBuf.length !== hmacBuf.length) return false;
  return timingSafeEqual(sigBuf, hmacBuf);
}

export function resolvePlanFromPriceId(priceId: string): "PRO" | "PRO_MAX" {
  const proMaxPriceId = process.env.PADDLE_PRO_MAX_PRICE_ID;
  if (proMaxPriceId && priceId === proMaxPriceId) return "PRO_MAX";
  return "PRO";
}
