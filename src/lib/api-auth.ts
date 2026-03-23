import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function authenticateApiKey(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const apiKey = authHeader.slice(7);

  // Hashed key lookup only — plaintext fallback removed (migration complete)
  const hash = hashApiKey(apiKey);
  const project = await prisma.project.findFirst({ where: { apiKeyHash: hash } });
  return project;
}

type AuthResult =
  | { type: "session"; userId: string }
  | { type: "apikey"; projectId: string }
  | null;

export async function authenticateRequest(req: Request): Promise<AuthResult> {
  // Try session auth first
  const session = await auth();
  if (session?.user?.id) {
    return { type: "session", userId: session.user.id };
  }

  // Fall back to API key auth
  const project = await authenticateApiKey(req);
  if (project) {
    return { type: "apikey", projectId: project.id };
  }

  return null;
}

type ProjectAccessResult =
  | { type: "session"; userId: string; role: string }
  | { type: "apikey"; projectId: string; role: string }
  | null;

/**
 * Verify the authenticated user has access to a specific project.
 * For session auth: checks ProjectMember exists (and optional role).
 * For API key auth: checks key belongs to the project.
 * Returns auth result with role, or null if denied.
 */
export async function requireProjectAccess(
  req: Request,
  projectId: string,
  options?: { roles?: string[] }
): Promise<ProjectAccessResult> {
  const authResult = await authenticateRequest(req);
  if (!authResult) return null;

  if (authResult.type === "apikey") {
    if (authResult.projectId !== projectId) return null;
    return { type: "apikey", projectId: authResult.projectId, role: "OWNER" };
  }

  // Session auth: check ProjectMember
  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: authResult.userId, projectId } },
    select: { role: true },
  });

  if (!member) return null;

  if (options?.roles && !options.roles.includes(member.role)) {
    return null;
  }

  return { type: "session", userId: authResult.userId, role: member.role };
}

/**
 * Helper to return a 401/403 response for project access failures.
 */
export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}
