import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { updateWorkspaceSchema } from "@/lib/validations/workspace";
import { apiRateLimit } from "@/lib/rate-limit";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const { projectId, workspaceId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  if (access.type === "apikey") {
    const result = await apiRateLimit.check(access.projectId);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  try {
    const workspace = await prisma.executionWorkspace.findFirst({
      where: { id: workspaceId, projectId },
      include: {
        agent: { select: { id: true, name: true, role: true, status: true } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json(workspace);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const { projectId, workspaceId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 512_000);
  if (!parsed.ok) return parsed.response;

  try {
    const data = updateWorkspaceSchema.parse(parsed.data);

    const existing = await prisma.executionWorkspace.findFirst({
      where: { id: workspaceId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.branchName !== undefined) updateData.branchName = data.branchName;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;
    if (data.status === "closed") updateData.closedAt = new Date();

    const workspace = await prisma.executionWorkspace.update({
      where: { id: workspaceId },
      data: updateData,
      include: {
        agent: { select: { id: true, name: true, role: true, status: true } },
      },
    });

    return NextResponse.json(workspace);
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Validation failed", details: err }, { status: 400 });
    }
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; workspaceId: string }> }
) {
  const { projectId, workspaceId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  try {
    const workspace = await prisma.executionWorkspace.findFirst({
      where: { id: workspaceId, projectId },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (workspace.status !== "closed") {
      return NextResponse.json(
        { error: "Only closed workspaces can be deleted" },
        { status: 400 }
      );
    }

    await prisma.executionWorkspace.delete({ where: { id: workspaceId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
