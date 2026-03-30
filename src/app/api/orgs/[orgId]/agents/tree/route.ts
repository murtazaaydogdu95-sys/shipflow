import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { sanitizeError } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "project:read");
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const agents = await prisma.agent.findMany({
      where: { orgId, status: { not: "terminated" } },
      select: {
        id: true,
        name: true,
        role: true,
        title: true,
        icon: true,
        status: true,
        reportsTo: true,
        storiesCompleted: true,
        _count: {
          select: { subordinates: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const tree = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      title: agent.title,
      icon: agent.icon,
      status: agent.status,
      reportsTo: agent.reportsTo,
      storiesCompleted: agent.storiesCompleted,
      subordinateCount: agent._count.subordinates,
    }));

    return NextResponse.json(tree);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
