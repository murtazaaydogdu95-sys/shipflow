import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { parseJsonBody } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      _count: { select: { members: true, projects: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    isPersonal: org.isPersonal,
    role: org.members[0]?.role ?? "MEMBER",
    _count: org._count,
    createdAt: org.createdAt,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as { name?: string };

  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Organization name must be at least 2 characters" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + nanoid(6);

  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      slug,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  // Switch to the new org
  await prisma.user.update({
    where: { id: session.user.id },
    data: { currentOrgId: org.id },
  });

  return NextResponse.json(org);
}
