import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations/project";
import { checkProjectLimit } from "@/lib/plan-limits";
import { checkOrgPermission } from "@/lib/permissions";
import { nanoid } from "nanoid";
import { createAuditLog } from "@/lib/audit-log";
import { parseJsonBody } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true },
  });

  // If user has a current org, scope projects to it; otherwise fallback to membership
  const projects = await prisma.project.findMany({
    where: user?.currentOrgId
      ? { orgId: user.currentOrgId }
      : { members: { some: { userId: session.user.id } } },
    include: { _count: { select: { stories: true, sprints: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = createProjectSchema.parse(parsed.data);

  // Get user's current org
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true },
  });

  const orgId = user?.currentOrgId;

  // If in an org, verify OWNER/ADMIN permission
  if (orgId) {
    const role = await checkOrgPermission(session.user.id, orgId, "project:create");
    if (!role) {
      return NextResponse.json({ error: "You don't have permission to create projects in this organization" }, { status: 403 });
    }
  }

  // Check plan limits
  const limitCheck = await checkProjectLimit(session.user.id, orgId);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.message }, { status: 403 });
  }

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + nanoid(6);

  const defaultLabels = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "database", color: "#8b5cf6" },
    { name: "API", color: "#f59e0b" },
    { name: "UI", color: "#ec4899" },
    { name: "auth", color: "#ef4444" },
    { name: "bug", color: "#dc2626" },
    { name: "feature", color: "#2563eb" },
    { name: "chore", color: "#737373" },
  ];

  const project = await prisma.project.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      techStack: data.techStack,
      apiKey: nanoid(32),
      orgId: orgId || undefined,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
      labels: {
        create: defaultLabels,
      },
    },
  });

  // Audit log
  if (orgId) {
    createAuditLog({
      action: "PROJECT_CREATED",
      details: `Created project: ${project.name}`,
      userId: session.user.id,
      orgId,
      req,
    }).catch(console.error);
  }

  return NextResponse.json(project);
}
