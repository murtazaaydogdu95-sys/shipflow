import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { decideApprovalSchema } from "@/lib/validations/approval";
import { decideApproval } from "@/lib/approvals";
import { ZodError } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string; approvalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, approvalId } = await params;

  const role = await checkOrgPermission(
    session.user.id,
    orgId,
    "project:read"
  );
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const approval = await prisma.approval.findFirst({
      where: { id: approvalId, orgId },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(approval);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; approvalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, approvalId } = await params;

  // Only OWNER/ADMIN can decide approvals
  const role = await checkOrgPermission(
    session.user.id,
    orgId,
    "org:approvals"
  );
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = decideApprovalSchema.parse(parsed.data);
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

  // Verify approval belongs to the org
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, orgId },
  });
  if (!approval) {
    return NextResponse.json(
      { error: "Approval not found" },
      { status: 404 }
    );
  }

  try {
    await decideApproval({
      approvalId,
      decision: data.status,
      decidedById: session.user.id,
      comment: data.reason,
    });

    const updated = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("Four-eyes")) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      if (err.message.includes("Cannot transition")) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
    }
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
