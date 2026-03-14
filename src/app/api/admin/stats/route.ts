import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [users, projects, stories, orgs] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.project.count(),
    prisma.story.count(),
    prisma.organization.count(),
  ]);

  return NextResponse.json({ users, projects, stories, orgs });
}
