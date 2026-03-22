import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
import { updateProjectSchema } from "@/lib/validations/project";
import { sanitizeError, sanitizeValidationError, parseJsonBody } from "@/lib/api-error";
import { existsSync, rmSync } from "fs";
import { createAuditLog } from "@/lib/audit-log";
import { encrypt, safeDecrypt } from "@/lib/encryption";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      techStack: true,
      githubRepo: true,
      orgId: true,
      isPublic: true,
      agentAutoAssign: true,
      agentMinPriority: true,
      agentWorkingDir: true,
      aiProvider: true,
      aiApiKey: true,
      maxConcurrentAgents: true,
      deployProvider: true,
      deployProjectId: true,
      apiKeyPrefix: true,
      apiKeyLastRotated: true,
      labels: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { stories: true, sprints: true } },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...project, aiApiKey: safeDecrypt(project.aiApiKey) || undefined });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return forbiddenResponse("Only project owners can update settings");

  const parsed = await parseJsonBody(req, 512_000);
  if (!parsed.ok) return parsed.response;

  let data;
  try {
    data = updateProjectSchema.parse(parsed.data);
  } catch (err) {
    return NextResponse.json({ error: sanitizeValidationError(err) }, { status: 400 });
  }

  // Encrypt aiApiKey before storing
  if (data.aiApiKey) {
    data.aiApiKey = encrypt(data.aiApiKey);
  }

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      select: { name: true, orgId: true },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Audit log
    if (access.type === "session" && project.orgId) {
      createAuditLog({
        action: "PROJECT_UPDATED",
        details: `Updated project: ${project.name}`,
        userId: access.userId,
        orgId: project.orgId,
        req,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = sanitizeError(err, "Failed to update project");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return forbiddenResponse("Only project owners can delete projects");

  // Clean up cloned repo directory if it exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true, name: true, orgId: true },
  });

  // Audit log before deletion
  if (access.type === "session" && project?.orgId) {
    await createAuditLog({
      action: "PROJECT_DELETED",
      details: `Deleted project: ${project.name}`,
      userId: access.userId,
      orgId: project.orgId,
      req,
    }).catch(console.error);
  }

  await prisma.project.delete({ where: { id: projectId } });

  if (project?.agentWorkingDir && existsSync(project.agentWorkingDir)) {
    try {
      rmSync(project.agentWorkingDir, { recursive: true, force: true });
    } catch {
      // Non-fatal — project is already deleted from DB
    }
  }

  return NextResponse.json({ success: true });
}
