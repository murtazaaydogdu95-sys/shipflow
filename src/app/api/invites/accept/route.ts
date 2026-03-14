import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { parseJsonBody } from "@/lib/api-error";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as { token?: string };

  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { org: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    await prisma.orgInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  // Check if already a member
  const existing = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: invite.orgId } },
  });
  if (existing) {
    await prisma.orgInvite.delete({ where: { id: invite.id } });
    return NextResponse.json({ error: "You are already a member of this organization" }, { status: 400 });
  }

  // Create membership and delete invite
  await prisma.orgMember.create({
    data: {
      userId: session.user.id,
      orgId: invite.orgId,
      role: invite.role,
    },
  });

  // Switch user to the new org
  await prisma.user.update({
    where: { id: session.user.id },
    data: { currentOrgId: invite.orgId },
  });

  await prisma.orgInvite.delete({ where: { id: invite.id } });

  // Notify org owners
  const owners = await prisma.orgMember.findMany({
    where: { orgId: invite.orgId, role: "OWNER" },
    select: { userId: true },
  });
  for (const owner of owners) {
    createNotification({
      userId: owner.userId,
      type: "INVITE_ACCEPTED",
      title: "Invite accepted",
      message: `${session.user.name || session.user.email} joined ${invite.org.name}`,
      href: "/org/members",
    }).catch(console.error);
  }

  return NextResponse.json({ success: true, orgId: invite.orgId, orgName: invite.org.name });
}
