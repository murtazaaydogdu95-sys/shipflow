import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { rewriteWithAI } from "@/lib/ai-rewrite";
import { parseJsonBody } from "@/lib/api-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const { rawInput, techStack } = parsed.data as { rawInput?: string; techStack?: string };

  if (!rawInput || typeof rawInput !== "string" || rawInput.length < 10) {
    return NextResponse.json({ error: "Input too short to split" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { aiProvider: true, aiApiKey: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const provider = project.aiProvider || "ollama";
  const apiKey =
    provider === "ollama"
      ? undefined
      : project.aiApiKey ||
        (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : undefined);

  if (provider !== "ollama" && !apiKey) {
    return NextResponse.json({ error: "No AI API key configured" }, { status: 400 });
  }

  const prompt = `You are an expert agile product manager. Split this feature idea into 3-5 smaller, implementable user stories.

${techStack ? `Tech Stack: ${techStack}` : ""}
Feature idea: "${rawInput}"

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "stories": [
    {
      "tempId": "1",
      "title": "Short descriptive title",
      "userStory": "As a [role], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        { "given": "context", "when": "action", "then": "result" }
      ],
      "storyPoints": 3,
      "priority": "MEDIUM",
      "type": "feature",
      "dependsOn": []
    }
  ]
}

Rules:
- Split into 3-5 stories, ordered by implementation sequence
- Use dependsOn to reference tempIds of stories that must be completed first
- First story should have no dependencies
- Each story should be independently implementable
- Story types: feature, bug, chore, refactor, docs, test
- Priority: LOW, MEDIUM, HIGH, CRITICAL
- Story points: 1 (trivial), 2 (small), 3 (medium), 5 (large)`;

  try {
    const result = await rewriteWithAI({ provider, apiKey, prompt }) as {
      stories: Array<{
        tempId: string;
        title: string;
        userStory: string;
        acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
        storyPoints: number;
        priority: string;
        type: string;
        dependsOn: string[];
      }>;
    };

    return NextResponse.json({ stories: result.stories || [] });
  } catch (error) {
    console.error("[split] AI split failed:", error);
    return NextResponse.json({ error: "AI split failed" }, { status: 500 });
  }
}
