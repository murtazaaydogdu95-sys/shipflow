import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { rewriteWithAI } from "@/lib/ai-rewrite";
import { safeDecrypt } from "@/lib/encryption";
import { aiRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
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

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get stories completed in last 24h
  const completedActivities = await prisma.activity.findMany({
    where: {
      projectId,
      type: "STORY_MOVED",
      message: { contains: "DONE" },
      createdAt: { gte: yesterday },
    },
    include: { story: { select: { shortId: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Get in-progress stories
  const inProgress = await prisma.story.findMany({
    where: { projectId, status: "IN_PROGRESS" },
    select: { shortId: true, title: true, assignedToAgent: true, agentStatus: true },
  });

  // Get blocked stories
  const blocked = await prisma.story.findMany({
    where: {
      projectId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      blockedByDeps: { some: { blocker: { status: { not: "DONE" } } } },
    },
    select: { shortId: true, title: true },
  });

  // Get review stories
  const inReview = await prisma.story.findMany({
    where: { projectId, status: "REVIEW" },
    select: { shortId: true, title: true },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { aiProvider: true, aiApiKey: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const provider = project.aiProvider || "ollama";
  const decryptedAiKey = safeDecrypt(project.aiApiKey);
  const apiKey =
    provider === "ollama"
      ? undefined
      : decryptedAiKey ||
        (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : undefined);

  // Build summary data
  const completedList = completedActivities
    .filter((a) => a.story)
    .map((a) => `- ${a.story!.shortId}: ${a.story!.title}`)
    .join("\n") || "None";

  const inProgressList = inProgress
    .map((s) => `- ${s.shortId}: ${s.title}${s.assignedToAgent ? ` (Agent: ${s.agentStatus || "assigned"})` : ""}`)
    .join("\n") || "None";

  const blockedList = blocked
    .map((s) => `- ${s.shortId}: ${s.title}`)
    .join("\n") || "None";

  const reviewList = inReview
    .map((s) => `- ${s.shortId}: ${s.title}`)
    .join("\n") || "None";

  // If no AI key, return raw data
  if (provider !== "ollama" && !apiKey) {
    return NextResponse.json({
      summary: `## Daily Standup — ${project.name}\n\n### Completed Yesterday\n${completedList}\n\n### In Progress\n${inProgressList}\n\n### Needs Review\n${reviewList}\n\n### Blocked\n${blockedList}`,
    });
  }

  // System prompt contains only trusted instructions
  const systemPrompt = `Generate a concise daily standup summary. Write in first person as a solo developer.
Format as clean markdown with sections. Keep it brief (3-5 sentences total). Respond with ONLY the markdown text, no JSON wrapping.`;

  // User message contains the project data — isolated from system instructions
  const userMessage = `Project: ${project.name}

Completed yesterday:
${completedList}

In progress:
${inProgressList}

Needs review:
${reviewList}

Blocked:
${blockedList}`;

  try {
    const result = await rewriteWithAI({ provider, apiKey, systemPrompt, userMessage });
    // The result will be JSON but we want the text content
    const summary = typeof result === "string" ? result : JSON.stringify(result);
    return NextResponse.json({ summary });
  } catch {
    // Fallback to raw data if AI fails
    return NextResponse.json({
      summary: `## Daily Standup — ${project.name}\n\n### Completed Yesterday\n${completedList}\n\n### In Progress\n${inProgressList}\n\n### Needs Review\n${reviewList}\n\n### Blocked\n${blockedList}`,
    });
  }
}
