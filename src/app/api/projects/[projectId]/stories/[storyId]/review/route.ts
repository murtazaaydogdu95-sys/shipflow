import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { rewriteWithAI } from "@/lib/ai-rewrite";
import { safeDecrypt } from "@/lib/encryption";
import { sanitizeError } from "@/lib/api-error";
import { aiRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findUnique({
    where: { id: storyId, projectId },
    select: { aiReviewScore: true, aiReviewResult: true, aiReviewedAt: true },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json({
    score: story.aiReviewScore,
    issues: story.aiReviewResult ? JSON.parse(story.aiReviewResult) : null,
    reviewedAt: story.aiReviewedAt,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Rate limit AI requests per user/project
  const rlKey = access.type === "session" ? access.userId : access.projectId;
  const rl = await aiRateLimit.check(rlKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many AI requests. Please wait a moment before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId, projectId },
    select: { branchName: true, title: true },
  });

  if (!story?.branchName) {
    return NextResponse.json({ error: "No branch found" }, { status: 404 });
  }

  // Validate branch name to prevent git argument injection
  const BRANCH_NAME_RE = /^[a-zA-Z0-9\/_.\-]+$/;
  if (!BRANCH_NAME_RE.test(story.branchName)) {
    return NextResponse.json({ error: "Invalid branch name" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { agentWorkingDir: true, aiProvider: true, aiApiKey: true },
  });

  if (!project?.agentWorkingDir) {
    return NextResponse.json({ error: "No working directory configured" }, { status: 400 });
  }

  // Get the diff
  let diff: string;
  try {
    diff = execFileSync(
      "git",
      ["diff", `main...${story.branchName}`],
      {
        cwd: project.agentWorkingDir,
        encoding: "utf-8",
        timeout: 15000,
        maxBuffer: 5 * 1024 * 1024,
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to get diff" }, { status: 500 });
  }

  if (!diff.trim()) {
    return NextResponse.json({ error: "No changes to review" }, { status: 400 });
  }

  // Truncate very large diffs
  const truncatedDiff = diff.length > 15000 ? diff.slice(0, 15000) + "\n... (truncated)" : diff;

  const provider = project.aiProvider || "ollama";
  const decryptedAiKey = safeDecrypt(project.aiApiKey);
  const apiKey =
    provider === "ollama"
      ? undefined
      : decryptedAiKey ||
        (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : undefined);

  if (provider !== "ollama" && !apiKey) {
    return NextResponse.json({ error: "No AI API key configured" }, { status: 400 });
  }

  // System prompt contains only trusted instructions
  const systemPrompt = `You are a senior code reviewer. Review the provided git diff and provide feedback.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "score": 85,
  "issues": [
    {
      "file": "src/example.ts",
      "line": 42,
      "severity": "warning",
      "message": "Brief description of the issue",
      "suggestion": "How to fix it"
    }
  ]
}

Rules:
- Score 0-100 (100 = perfect)
- severity: "info" | "warning" | "error"
- Focus on: bugs, security issues, performance, code quality, missing error handling
- Be concise. Max 10 issues.
- If code looks good, return high score with few/no issues.`;

  // User message contains the diff and story context — isolated from system instructions
  const userMessage = `Story: ${story.title}\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``;

  try {
    const result = await rewriteWithAI({ provider, apiKey, systemPrompt, userMessage }) as {
      score: number;
      issues: Array<{ file: string; line: number; severity: string; message: string; suggestion: string }>;
    };

    const score = Math.min(100, Math.max(0, Number(result.score) || 0));
    const issues = Array.isArray(result.issues) ? result.issues : [];

    await prisma.story.update({
      where: { id: storyId },
      data: {
        aiReviewScore: score,
        aiReviewResult: JSON.stringify(issues),
        aiReviewedAt: new Date(),
      },
    });

    return NextResponse.json({ score, issues, reviewedAt: new Date() });
  } catch (error) {
    console.error("[ai-review] review failed:", sanitizeError(error, "AI review failed"));
    return NextResponse.json({ error: "AI review failed" }, { status: 500 });
  }
}
