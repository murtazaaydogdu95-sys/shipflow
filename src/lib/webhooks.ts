import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";
import { isPublicUrl } from "@/lib/validations/webhook";

const MAX_PAYLOAD_BYTES = 64_000; // 64KB cap for stored webhook payloads

/**
 * Calculate exponential backoff delay: 30s * 4^attempt, capped at 2 hours.
 */
function getBackoffMs(attempt: number): number {
  return Math.min(30_000 * Math.pow(4, attempt), 2 * 60 * 60 * 1000);
}

/**
 * Attempt a single webhook delivery. Updates the delivery record with results.
 * Reusable by both initial dispatch and cron retry.
 */
export async function attemptDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  // Skip if delivery not found, webhook deleted, or already terminal
  // Allow PENDING (first attempt) and RETRYING (cron retry)
  if (!delivery || !delivery.webhook || delivery.status === "SUCCESS" || delivery.status === "FAILED" || delivery.status === "DEAD_LETTER") return;

  // Re-validate URL at delivery time to prevent DNS rebinding SSRF
  if (!isPublicUrl(delivery.webhook.url)) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", errorMessage: "Webhook URL resolved to a private/internal address", lastAttemptAt: new Date(), nextRetryAt: null },
    });
    return;
  }

  const signature = createHmac("sha256", delivery.webhook.secret)
    .update(delivery.payload)
    .digest("hex");

  try {
    const res = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Codepylot-Event": delivery.event,
        "X-Codepylot-Signature": `sha256=${signature}`,
      },
      body: delivery.payload,
      signal: AbortSignal.timeout(10_000),
    });

    const responseBody = await res.text().catch(() => "");
    const newAttempts = delivery.attempts + 1;

    if (res.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SUCCESS",
          httpStatus: res.status,
          responseBody: responseBody.slice(0, 1024),
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          nextRetryAt: null,
        },
      });
    } else {
      const exhausted = newAttempts >= delivery.maxAttempts;
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: exhausted ? "DEAD_LETTER" : "PENDING",
          httpStatus: res.status,
          responseBody: responseBody.slice(0, 1024),
          errorMessage: `HTTP ${res.status}`,
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          nextRetryAt: exhausted ? null : new Date(Date.now() + getBackoffMs(newAttempts)),
        },
      });
      if (exhausted) {
        await logDeadLetter(delivery.webhook.projectId, delivery.event, delivery.webhook.url, `HTTP ${res.status}`);
      }
    }
  } catch (err) {
    const newAttempts = delivery.attempts + 1;
    const exhausted = newAttempts >= delivery.maxAttempts;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    try {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: exhausted ? "DEAD_LETTER" : "PENDING",
          errorMessage,
          attempts: newAttempts,
          lastAttemptAt: new Date(),
          nextRetryAt: exhausted ? null : new Date(Date.now() + getBackoffMs(newAttempts)),
        },
      });
      if (exhausted) {
        await logDeadLetter(delivery.webhook.projectId, delivery.event, delivery.webhook.url, errorMessage);
      }
    } catch (dbErr) {
      // If the DB update itself fails, log and move on — cron will pick it up again
      console.error(`[webhooks] Failed to update delivery ${deliveryId} after error:`, dbErr);
    }
  }
}

/**
 * Log an activity when a webhook delivery enters the dead letter queue.
 * This surfaces the failure in the project's activity feed.
 */
async function logDeadLetter(projectId: string, event: string, url: string, reason: string) {
  try {
    await prisma.activity.create({
      data: {
        type: "WEBHOOK_DEAD_LETTER",
        message: `Webhook delivery failed after all retries: ${event} → ${url} (${reason})`,
        projectId,
      },
    });
  } catch (err) {
    console.error("[webhooks] Failed to log dead letter activity:", err);
  }
}

/**
 * Dispatch a webhook event to all active webhooks for a project.
 * Creates delivery records and attempts first delivery immediately.
 * Failure on one webhook does not block others.
 */
export async function dispatchWebhook(
  projectId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const webhooks = await prisma.webhook.findMany({
    where: { projectId, active: true },
  });

  for (const webhook of webhooks) {
    try {
      const events: string[] = JSON.parse(webhook.events);
      if (!events.includes(event) && !events.includes("*")) continue;

      let body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

      // Cap payload size to prevent oversized DB storage
      if (body.length > MAX_PAYLOAD_BYTES) {
        body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: { _truncated: true, message: "Payload exceeded 64KB limit" } });
      }

      // Create delivery record
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: body,
          nextRetryAt: new Date(),
        },
      });

      // Attempt first delivery (fire-and-forget)
      attemptDelivery(delivery.id).catch((err) => {
        console.error(`[webhooks] Failed to attempt delivery ${delivery.id}:`, err instanceof Error ? err.message : err);
      });
    } catch (err) {
      // Per-webhook error isolation — don't block other webhooks
      console.error(`[webhooks] Failed to create delivery for webhook ${webhook.id}:`, err instanceof Error ? err.message : err);
    }
  }
}
