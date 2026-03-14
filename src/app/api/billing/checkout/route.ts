import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lemonSqueezyEnabled, createCheckout } from "@/lib/lemonsqueezy";
import { checkOrgPermission } from "@/lib/permissions";

export async function POST() {
  if (!lemonSqueezyEnabled) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true },
  });

  if (!user?.currentOrgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  const role = await checkOrgPermission(session.user.id, user.currentOrgId, "org:billing");
  if (!role) {
    return NextResponse.json({ error: "Only organization owners can manage billing" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.currentOrgId },
    select: { plan: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.plan === "PRO") {
    return NextResponse.json({ error: "Already on Pro plan" }, { status: 400 });
  }

  const url = await createCheckout(user.currentOrgId, session.user.id, session.user.email);

  if (!url) {
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
