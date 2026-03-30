import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";
import { sanitizeError } from "@/lib/api-error";
import { triggerRoutineManually } from "@/lib/routine-engine";
import { createHmac, timingSafeEqual } from "crypto";

type RouteParams = { params: Promise<{ projectId: string; routineId: string }> };

/**
 * Verify HMAC-SHA256 webhook signature.
 */
function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const sig = signature.replace("sha256=", "");
  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(sig, "hex");
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const { projectId, routineId } = await params;

  // Webhook triggers can either use project auth OR webhook secret
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, projectId },
  });

  if (!routine) {
    return NextResponse.json({ error: "Routine not found" }, { status: 404 });
  }

  if (!routine.active) {
    return NextResponse.json({ error: "Routine is not active" }, { status: 400 });
  }

  // Determine auth method
  const isWebhookCall = routine.webhookEnabled;
  let bodyText = "";

  if (isWebhookCall && routine.webhookAuthType === "hmac" && routine.webhookSecret) {
    bodyText = await req.text();
    const signature = req.headers.get("x-webhook-signature") ?? "";
    const timestamp = req.headers.get("x-webhook-timestamp");

    if (!timestamp) {
      return NextResponse.json({ error: "Missing X-Webhook-Timestamp header" }, { status: 403 });
    }
    const requestTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 300) {
      return NextResponse.json({ error: "Request timestamp expired" }, { status: 403 });
    }

    const signedPayload = `${timestamp}.${bodyText}`;
    if (!verifyHmacSignature(signedPayload, signature, routine.webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (isWebhookCall && routine.webhookAuthType === "bearer") {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !routine.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const expectedBuf = Buffer.from(routine.webhookSecret);
    const providedBuf = Buffer.from(token);
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }
  } else {
    // Standard project auth (session or API key)
    const access = await requireProjectAccess(req, projectId);
    if (!access) return forbiddenResponse();
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }
  }

  let webhookPayload: unknown = null;
  if (bodyText) {
    try {
      webhookPayload = JSON.parse(bodyText);
    } catch {
      // Non-JSON payload is acceptable for webhooks
      webhookPayload = { raw: bodyText.slice(0, 2000) };
    }
  }

  try {
    const source = isWebhookCall ? "webhook" as const : "on_demand" as const;
    const result = await triggerRoutineManually(routineId, source, webhookPayload);
    return NextResponse.json(result, { status: result.skipped ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Routine not found" || message === "Routine is not active") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: sanitizeError(err, "Failed to trigger routine") },
      { status: 500 }
    );
  }
}
