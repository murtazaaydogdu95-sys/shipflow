import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
import { hashApiKey } from "@/lib/api-auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId, {
    roles: ["OWNER", "ADMIN"],
  });
  if (!access) return access === null ? unauthorizedResponse() : forbiddenResponse();

  let body: { rotate?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — treat as generate
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { apiKeyHash: true, apiKey: true, orgId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isRotate = body.rotate === true;
  const hasExistingKey = !!(project.apiKeyHash || project.apiKey);

  if (!isRotate && hasExistingKey) {
    return NextResponse.json(
      { error: "API key already exists. Use rotate to replace it." },
      { status: 400 }
    );
  }

  // Generate new key
  const rawKey = `sk_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = rawKey.slice(0, 12) + "...";

  await prisma.project.update({
    where: { id: projectId },
    data: {
      apiKeyHash: keyHash,
      apiKeyPrefix: prefix,
      apiKeyLastRotated: new Date(),
      apiKey: null, // Clear plaintext on generate/rotate
    },
  });

  // Create audit log
  if (project.orgId && access.type === "session") {
    await prisma.auditLog.create({
      data: {
        action: isRotate ? "API_KEY_ROTATED" : "API_KEY_CREATED",
        details: JSON.stringify({ projectId }),
        userId: access.userId,
        orgId: project.orgId,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      },
    });
  }

  return NextResponse.json({ key: rawKey, prefix });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId, {
    roles: ["OWNER", "ADMIN"],
  });
  if (!access) return access === null ? unauthorizedResponse() : forbiddenResponse();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      apiKeyHash: null,
      apiKeyPrefix: null,
      apiKeyLastRotated: null,
      apiKey: null,
    },
  });

  // Audit log
  if (project.orgId && access.type === "session") {
    await prisma.auditLog.create({
      data: {
        action: "API_KEY_REVOKED",
        details: JSON.stringify({ projectId }),
        userId: access.userId,
        orgId: project.orgId,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
