import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api-error";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 1_024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;

  const { orgId } = body as { orgId?: string };
  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Verify user is a member of this org
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { currentOrgId: orgId },
  });

  return NextResponse.json({ success: true, orgId });
}
