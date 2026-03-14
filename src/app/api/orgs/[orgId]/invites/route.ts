import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const role = await checkOrgPermission(session.user.id, orgId, "org:members");
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await prisma.orgInvite.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;
  const role = await checkOrgPermission(session.user.id, orgId, "org:members");
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const inviteId = searchParams.get("id");
  if (!inviteId) return NextResponse.json({ error: "Invite ID required" }, { status: 400 });

  await prisma.orgInvite.deleteMany({
    where: { id: inviteId, orgId },
  });

  return NextResponse.json({ success: true });
}
