import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { approvalCommentSchema } from "@/lib/validations/approval";
import { ZodError } from "zod";

export async function GET(
  req: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; approvalId: string }> }
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

  // Verify approval belongs to the org
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, orgId },
    select: { id: true },
  });
  if (!approval) {
    return NextResponse.json(
      { error: "Approval not found" },
      { status: 404 }
    );
  }

  try {
    const comments = await prisma.approvalComment.findMany({
      where: { approvalId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; approvalId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, approvalId } = await params;

  // Any org member can comment
  const role = await checkOrgPermission(
    session.user.id,
    orgId,
    "project:read"
  );
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify approval belongs to the org
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId, orgId },
    select: { id: true },
  });
  if (!approval) {
    return NextResponse.json(
      { error: "Approval not found" },
      { status: 404 }
    );
  }

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = approvalCommentSchema.parse(parsed.data);
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
    const comment = await prisma.approvalComment.create({
      data: {
        approvalId,
        userId: session.user.id,
        content: data.content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
