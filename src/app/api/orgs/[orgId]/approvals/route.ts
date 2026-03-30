import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { createApprovalSchema } from "@/lib/validations/approval";
import { createApproval } from "@/lib/approvals";
import { ZodError } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  const role = await checkOrgPermission(
    session.user.id,
    orgId,
    "project:read"
  );
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { orgId };
  if (status) where.status = status;
  if (type) where.type = type;

  try {
    const approvals = await prisma.approval.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(approvals);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  // Any org member can create an approval request
  const role = await checkOrgPermission(
    session.user.id,
    orgId,
    "project:read"
  );
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 8_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = createApprovalSchema.parse(parsed.data);
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return NextResponse.json(
        { error: `Validation failed: ${messages.join(", ")}` },
        { status: 400 }
      );
    }
    throw err;
  }

  try {
    const approval = await createApproval({
      orgId,
      type: data.type,
      payload: data.payload,
      requestedById: session.user.id,
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
