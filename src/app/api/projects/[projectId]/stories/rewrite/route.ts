import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rewriteStorySchema } from "@/lib/validations/story";
import { rewriteWithAI } from "@/lib/ai-rewrite";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const body = await req.json();
  const { rawInput, techStack } = rewriteStorySchema.parse(body);

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.user.id } },
    },
    select: { aiProvider: true, aiApiKey: true },
  });

  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const provider = project.aiProvider || "anthropic";
  const apiKey =
    provider === "ollama"
      ? undefined
      : project.aiApiKey ||
        (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : undefined);

  if (provider !== "ollama" && !apiKey) {
    return NextResponse.json(
      { error: `No API key configured for ${provider}. Set one in Project Settings.` },
      { status: 400 }
    );
  }

  const prompt = `You are an expert agile product manager AI. Transform this rough feature idea into a structured user story.

${techStack ? `Tech Stack: ${techStack}` : ""}
Feature idea: "${rawInput}"

Respond in this exact JSON format (no markdown, no code fences, just JSON):
{
  "title": "Short descriptive title (max 80 chars)",
  "userStory": "As a [specific role], I want [specific feature] so that [clear benefit].",
  "acceptanceCriteria": [
    { "given": "context/precondition", "when": "action", "then": "expected result" }
  ],
  "storyPoints": 3,
  "priority": "MEDIUM",
  "labels": ["frontend", "API"]
}

Rules:
- Generate 3-5 acceptance criteria in Given/When/Then format
- Story points: 1 (trivial), 2 (small), 3 (medium), 5 (large), 8 (very large)
- Priority: LOW, MEDIUM, HIGH, or CRITICAL
- Labels from: frontend, backend, database, API, UI, auth, payments, testing, devops, bug, feature, chore
- Keep language concise and developer-focused`;

  try {
    const result = await rewriteWithAI({ provider, apiKey, prompt });
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI rewrite error:", error);
    return NextResponse.json(
      { error: provider === "ollama"
          ? "AI rewrite failed. Make sure Ollama is running (ollama serve) with llama3.2 pulled."
          : `AI rewrite failed. Check your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key in Project Settings.` },
      { status: 500 }
    );
  }
}
