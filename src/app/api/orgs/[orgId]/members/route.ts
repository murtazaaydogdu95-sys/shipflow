import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  // Any member can list members
  const isMember = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.orgMember.findMany({
    where: { orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:members");
  if (!role) return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;

  const { email, role: memberRole = "MEMBER" } = body as { email?: string; role?: string };
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!["OWNER", "ADMIN", "MEMBER"].includes(memberRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only OWNERs can assign the OWNER role — prevent privilege escalation
  if (memberRole === "OWNER" && role !== "OWNER") {
    return NextResponse.json({ error: "Only organization owners can assign the OWNER role" }, { status: 403 });
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Check if already a member
    const existing = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId } },
    });
    if (existing) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // User exists — add them directly
    const member = await prisma.orgMember.create({
      data: { userId: user.id, orgId, role: memberRole },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json(member);
  }

  // User doesn't exist — create a pending invite
  const existingInvite = await prisma.orgInvite.findUnique({
    where: { email_orgId: { email, orgId } },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "An invite is already pending for this email" }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const invite = await prisma.orgInvite.create({
    data: {
      email,
      orgId,
      role: memberRole,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      invitedBy: session.user.id,
    },
  });

  // Send invite email
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const emailTemplate = inviteEmail({
    orgName: org?.name || "an organization",
    inviterName: inviter?.name || "Someone",
    inviteUrl: `${appUrl}/invite?token=${token}`,
  });
  sendEmail({ to: email, ...emailTemplate }).catch((err) =>
    console.error("[invite] email send failed:", err)
  );

  return NextResponse.json({ invite: true, id: invite.id, email, role: memberRole });
}
