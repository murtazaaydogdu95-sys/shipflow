import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { readFile } from "fs/promises";

// Only allow cuid-like IDs (alphanumeric) to prevent path traversal
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Validate storyId format to prevent path traversal
  if (!SAFE_ID_RE.test(storyId)) {
    return NextResponse.json({ error: "Invalid story ID" }, { status: 400 });
  }

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({
    where: { id: storyId, projectId },
    select: { id: true },
  });
  if (!storyCheck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const logPath = `/tmp/codepylot-agent-${storyId}.log`;

  try {
    const content = await readFile(logPath, "utf-8");
    // Return last 500 lines to keep response manageable
    const lines = content.split("\n");
    const tail = lines.slice(-500).join("\n");
    return NextResponse.json({ log: tail, totalLines: lines.length });
  } catch {
    return NextResponse.json({ log: "", totalLines: 0 });
  }
}
