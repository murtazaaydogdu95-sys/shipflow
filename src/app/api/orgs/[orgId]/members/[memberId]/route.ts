import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:members");
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseJsonBody(req, 1_024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;

  const { role: newRole } = body as { role?: string };
  if (!newRole || !["OWNER", "ADMIN", "MEMBER"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only OWNERs can assign the OWNER role — prevent privilege escalation
  if (newRole === "OWNER" && role !== "OWNER") {
    return NextResponse.json({ error: "Only organization owners can assign the OWNER role" }, { status: 403 });
  }

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Cannot change own role
  if (member.userId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const updated = await prisma.orgMember.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:members");
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const member = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!member || member.orgId !== orgId) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Cannot remove yourself
  if (member.userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself. Transfer ownership first." }, { status: 400 });
  }

  // Cannot remove an OWNER (unless you're also OWNER)
  if (member.role === "OWNER" && role !== "OWNER") {
    return NextResponse.json({ error: "Cannot remove an owner" }, { status: 403 });
  }

  await prisma.orgMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
