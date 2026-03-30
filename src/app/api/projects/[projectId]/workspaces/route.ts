import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { createWorkspaceSchema } from "@/lib/validations/workspace";
import { apiRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api-error";
import { sanitizeError } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const agentId = searchParams.get("agentId");

  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (agentId) where.agentId = agentId;

  try {
    const workspaces = await prisma.executionWorkspace.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true, role: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workspaces);
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
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

  const parsed = await parseJsonBody(req, 512_000);
  if (!parsed.ok) return parsed.response;

  try {
    const data = createWorkspaceSchema.parse(parsed.data);

    // Resolve orgId from project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });
    if (!project?.orgId) {
      return NextResponse.json({ error: "Project has no organization" }, { status: 400 });
    }

    // Validate agent belongs to the same org
    if (data.agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: data.agentId, orgId: project.orgId },
        select: { id: true },
      });
      if (!agent) {
        return NextResponse.json({ error: "Agent not found in this organization" }, { status: 400 });
      }
    }

    // Ensure no duplicate active workspace with same workingDir
    const existing = await prisma.executionWorkspace.findFirst({
      where: { projectId, workingDir: data.workingDir, status: "active" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An active workspace already exists with this working directory" },
        { status: 409 }
      );
    }

    const workspace = await prisma.executionWorkspace.create({
      data: {
        projectId,
        orgId: project.orgId,
        agentId: data.agentId ?? null,
        workingDir: data.workingDir,
        branchName: data.branchName ?? null,
        cloneUrl: data.cloneUrl ?? null,
        metadata: data.metadata ?? null,
      },
      include: {
        agent: { select: { id: true, name: true, role: true, status: true } },
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json({ error: "Validation failed", details: err }, { status: 400 });
    }
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
