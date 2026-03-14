import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { z } from "zod";
import { isValidTransition, getValidTransitions } from "@/lib/story-state-machine";
import { parseJsonBody } from "@/lib/api-error";

const bulkUpdateSchema = z.object({
  storyIds: z.array(z.string()).min(1).max(100),
  update: z.object({
    status: z.enum(["ICEBOX", "BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
    priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
    sprintId: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
  }),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { storyIds, update } = bulkUpdateSchema.parse(parsed.data);

  // Wrap read + validate + update in a transaction to prevent TOCTOU races
  const result = await prisma.$transaction(async (tx) => {
    const stories = await tx.story.findMany({
      where: { id: { in: storyIds }, projectId },
      select: { id: true, status: true },
    });
    if (stories.length !== storyIds.length) {
      return { error: "Some stories not found", status: 404 } as const;
    }

    // Validate status transitions for each story
    if (update.status) {
      const invalid = stories.filter((s) => s.status !== update.status && !isValidTransition(s.status, update.status!));
      if (invalid.length > 0) {
        return {
          error: `Invalid status transition for ${invalid.length} story(ies)`,
          details: invalid.map((s) => ({
            storyId: s.id,
            from: s.status,
            to: update.status,
            validTransitions: getValidTransitions(s.status),
          })),
          status: 422,
        } as const;
      }
    }

    await tx.story.updateMany({
      where: { id: { in: storyIds }, projectId },
      data: update,
    });

    return { success: true, updated: storyIds.length } as const;
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, ...("details" in result ? { details: result.details } : {}) },
      { status: result.status }
    );
  }

  return NextResponse.json(result);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsedDel = await parseJsonBody(req);
  if (!parsedDel.ok) return parsedDel.response;
  const { storyIds } = z.object({ storyIds: z.array(z.string()).min(1) }).parse(parsedDel.data);

  await prisma.story.deleteMany({
    where: { id: { in: storyIds }, projectId },
  });

  return NextResponse.json({ success: true, deleted: storyIds.length });
}
