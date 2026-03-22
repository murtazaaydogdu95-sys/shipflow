import { NextResponse } from "next/server";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { checkRewriteLimit } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { safeDecrypt } from "@/lib/encryption";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { aiProvider: true, aiApiKey: true },
  });

  const provider = project?.aiProvider || "ollama";
  const decryptedAiKey = safeDecrypt(project?.aiApiKey);
  const hasByok = !!(decryptedAiKey && provider !== "ollama");

  if (hasByok) {
    return NextResponse.json({ used: 0, limit: null, remaining: null, unlimited: true });
  }

  const userId = access.type === "session" ? access.userId : "";
  const result = await checkRewriteLimit(projectId, userId, false);

  return NextResponse.json({
    used: result.used,
    limit: result.limit,
    remaining: result.remaining,
    unlimited: false,
  });
}
