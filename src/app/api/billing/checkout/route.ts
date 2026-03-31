import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { lemonSqueezyEnabled, createCheckout, LS_VARIANT_IDS } from "@/lib/lemonsqueezy";

export async function POST(req: Request) {
  if (!lemonSqueezyEnabled) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true, email: true },
  });

  if (!user?.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  const role = await checkOrgPermission(session.user.id, user.currentOrgId, "org:billing");
  if (!role) {
    return NextResponse.json({ error: "Only organization owners can manage billing" }, { status: 403 });
  }

  let body: { planId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planId = body.planId;
  console.log("[billing-checkout] planId:", planId, "LS_VARIANT_IDS:", JSON.stringify(LS_VARIANT_IDS));
  if (!planId || !LS_VARIANT_IDS[planId]) {
    return NextResponse.json({ error: `Invalid plan: ${planId}. Available: ${Object.keys(LS_VARIANT_IDS).join(", ")}. Values: ${Object.values(LS_VARIANT_IDS).join(", ")}` }, { status: 400 });
  }

  const variantId = LS_VARIANT_IDS[planId];
  if (!variantId) {
    return NextResponse.json({ error: "Plan variant not configured" }, { status: 500 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.currentOrgId },
    select: { name: true },
  });

  try {
    const url = await createCheckout({
      variantId,
      orgId: user.currentOrgId,
      orgName: org?.name || "",
      userEmail: user.email || session.user.email || "",
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing-checkout] Failed to create checkout:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
