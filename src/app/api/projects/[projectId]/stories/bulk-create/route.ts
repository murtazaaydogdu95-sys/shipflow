import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/api-error";
import { checkStoryLimit } from "@/lib/plan-limits";
import { z } from "zod";

const bulkStorySchema = z.object({
  tempId: z.string().optional(),
  title: z.string().min(1).max(200),
  userStory: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
  storyPoints: z.number().int().min(1).max(21).optional(),
  acceptanceCriteria: z.array(z.object({
    given: z.string().min(1),
    when: z.string().min(1),
    then: z.string().min(1),
  })).optional(),
  dependsOn: z.array(z.string()).optional(),
});

const bulkCreateSchema = z.object({
  stories: z.array(bulkStorySchema).min(1).max(20),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 1_000_000);
  if (!parsed.ok) return parsed.response;
  const { stories } = bulkCreateSchema.parse(parsed.data);

  // Check plan limits
  if (access.type === "session") {
    const limitCheck = await checkStoryLimit(projectId, access.userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }
  }

  const tempIdToRealId: Record<string, string> = {};

  const created = await prisma.$transaction(async (tx) => {
    // Get next shortId sequence using raw SQL MAX for reliable numeric sort
    const maxResult = await tx.$queryRaw<[{ max_num: number | null }]>`
      SELECT MAX(CAST(SUBSTRING("shortId" FROM 4) AS INTEGER)) as max_num
      FROM "Story"
    `;
    let seq = (maxResult[0]?.max_num ?? 0) + 1;
    const results = [];

    for (const story of stories) {
      const shortId = `SF-${String(seq++).padStart(3, "0")}`;
      const created = await tx.story.create({
        data: {
          shortId,
          title: story.title,
          description: story.userStory || story.description || null,
          userStory: story.userStory || null,
          status: "BACKLOG",
          priority: story.priority || "MEDIUM",
          type: story.type || "feature",
          storyPoints: story.storyPoints || null,
          projectId,
          acceptanceCriteria: story.acceptanceCriteria
            ? {
                create: story.acceptanceCriteria.map(
                  (ac: { given: string; when: string; then: string }, idx: number) => ({
                    given: ac.given,
                    when: ac.when,
                    then: ac.then,
                    position: idx,
                  })
                ),
              }
            : undefined,
        },
        include: {
          labels: { include: { label: true } },
          acceptanceCriteria: { orderBy: { position: "asc" } },
        },
      });

      tempIdToRealId[story.tempId || story.title] = created.id;
      results.push(created);
    }

    // Create dependencies after all stories are created
    for (const story of stories) {
      if (story.dependsOn && story.dependsOn.length > 0) {
        const blockedId = tempIdToRealId[story.tempId || story.title];
        for (const depTempId of story.dependsOn) {
          const blockerId = tempIdToRealId[depTempId];
          if (blockerId && blockedId) {
            await tx.storyDependency.create({
              data: { blockerId, blockedId },
            });
          }
        }
      }
    }

    return results;
  });

  return NextResponse.json(created);
}
