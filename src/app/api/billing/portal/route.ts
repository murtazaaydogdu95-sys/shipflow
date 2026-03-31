import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lemonSqueezyEnabled, getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { checkOrgPermission } from "@/lib/permissions";

export async function POST() {
  if (!lemonSqueezyEnabled) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
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

  const subscription = await prisma.subscription.findUnique({
    where: { orgId: user.currentOrgId },
    select: { externalSubscriptionId: true },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
  }

  const url = await getCustomerPortalUrl(subscription.externalSubscriptionId);

  if (!url) {
    return NextResponse.json({ error: "Failed to get portal URL" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
