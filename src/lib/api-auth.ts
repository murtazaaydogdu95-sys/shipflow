import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
  const project = await prisma.project.findUnique({ where: { apiKey } });
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
