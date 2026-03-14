import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      currentOrgId: true,
      orgMemberships: {
        include: {
          org: { select: { id: true, name: true, slug: true, isPersonal: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;

  const { name, image } = body as { name?: string; image?: string };

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof image === "string") data.image = image;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(user);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user is sole owner of any non-personal org
  const ownedOrgs = await prisma.orgMember.findMany({
    where: { userId: session.user.id, role: "OWNER" },
    include: {
      org: {
        include: {
          members: { where: { role: "OWNER" } },
        },
      },
    },
  });

  for (const membership of ownedOrgs) {
    if (!membership.org.isPersonal && membership.org.members.length === 1) {
      return NextResponse.json(
        {
          error: `You are the sole owner of "${membership.org.name}". Transfer ownership or delete the org first.`,
        },
        { status: 400 }
      );
    }
  }

  // Delete user (cascades to memberships, comments, etc.)
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ success: true });
}
