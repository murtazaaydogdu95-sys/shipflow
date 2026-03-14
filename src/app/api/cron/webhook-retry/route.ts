import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attemptDelivery } from "@/lib/webhooks";
import { timingSafeEqual } from "crypto";

export async function POST(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const vercelCron = req.headers.get("x-vercel-cron");
  const isVercel = !!process.env.VERCEL;
  if (!(isVercel && vercelCron)) {
    const expected = process.env.CRON_SECRET || "";
    const provided = secret || "";
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (!expected || expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Atomically claim PENDING deliveries by setting status to RETRYING.
  // This prevents duplicate processing across concurrent cron instances.
  const now = new Date();
  const claimed = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `UPDATE "WebhookDelivery"
     SET "status" = 'RETRYING'
     WHERE "id" IN (
       SELECT "id" FROM "WebhookDelivery"
       WHERE "status" = 'PENDING' AND "nextRetryAt" <= $1
       ORDER BY "nextRetryAt" ASC
       LIMIT 50
       FOR UPDATE SKIP LOCKED
     )
     RETURNING "id"`,
    now
  );

  let succeeded = 0;
  let failed = 0;

  // Process in concurrent batches of 10 to avoid exceeding function timeout
  const CONCURRENCY = 10;
  for (let i = 0; i < claimed.length; i += CONCURRENCY) {
    const batch = claimed.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (delivery) => {
        try {
          await attemptDelivery(delivery.id);
          const updated = await prisma.webhookDelivery.findUnique({
            where: { id: delivery.id },
            select: { status: true },
          });
          return updated?.status === "SUCCESS" ? "succeeded" : "failed";
        } catch (err) {
          console.error(`[webhook-retry] Error processing ${delivery.id}:`, err);
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: { status: "PENDING" },
          }).catch(() => {});
          return "failed";
        }
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === "succeeded") succeeded++;
      else failed++;
    }
  }

  return NextResponse.json({
    success: true,
    processed: claimed.length,
    succeeded,
    failed,
  });
}
