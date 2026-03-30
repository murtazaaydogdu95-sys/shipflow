import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse, forbiddenResponse } from "@/lib/api-auth";
import { createStorySchema } from "@/lib/validations/story";
import { checkStoryLimit, checkStoryLimitByProject } from "@/lib/plan-limits";
import { processNextStory } from "@/lib/agent-trigger";
import { apiRateLimit } from "@/lib/rate-limit";
import { dispatchWebhook } from "@/lib/webhooks";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return access === null ? unauthorizedResponse() : forbiddenResponse();

  // Rate limit API key requests
  if (access.type === "apikey") {
    const result = await apiRateLimit.check(access.projectId);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sprintId = searchParams.get("sprintId");
  const search = searchParams.get("search");
  const parentIdParam = searchParams.get("parentId");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const where: Record<string, unknown> = { projectId };
  if (status) where.status = status;
  if (sprintId) where.sprintId = sprintId;
  if (parentIdParam === "null") {
    where.parentId = null;
  } else if (parentIdParam) {
    where.parentId = parentIdParam;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { shortId: { contains: search, mode: "insensitive" } },
    ];
  }

  // Pagination: if page or limit is provided, use paginated response
  const hasPagination = pageParam !== null || limitParam !== null;
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(limitParam || "50", 10) || 50));
  const maxUnpaginated = 500;

  const includeRelations = {
    labels: { include: { label: true } },
    acceptanceCriteria: { orderBy: { position: "asc" as const } },
    assignee: { select: { id: true, name: true, image: true } },
    parent: { select: { id: true, shortId: true, title: true } },
    children: { select: { id: true, shortId: true, title: true, status: true, priority: true, type: true } },
    blockedByDeps: { include: { blocker: { select: { id: true, shortId: true, title: true, status: true } } } },
    blockingDeps: { include: { blocked: { select: { id: true, shortId: true, title: true, status: true } } } },
  };

  if (hasPagination) {
    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        include: includeRelations,
        orderBy: { position: "asc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.story.count({ where }),
    ]);

    return NextResponse.json({
      stories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  // Backward-compatible: return flat array, capped at 500
  const stories = await prisma.story.findMany({
    where,
    include: includeRelations,
    orderBy: { position: "asc" },
    take: maxUnpaginated,
  });

  return NextResponse.json(stories, {
    headers: {
      "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Rate limit API key requests
  if (access.type === "apikey") {
    const result = await apiRateLimit.check(access.projectId);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  const parsed = await parseJsonBody(req, 512_000);
  if (!parsed.ok) return parsed.response;
  const data = createStorySchema.parse(parsed.data);

  // Check plan limits for all auth methods
  if (access.type === "session") {
    const limitCheck = await checkStoryLimit(projectId, access.userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }
  } else if (access.type === "apikey") {
    // API key: resolve plan via project's org (no userId available)
    const limitCheck = await checkStoryLimitByProject(projectId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }
  }

  // Validate parentId if provided
  if (data.parentId) {
    const parent = await prisma.story.findFirst({
      where: { id: data.parentId, projectId },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Parent story not found in this project" },
        { status: 400 }
      );
    }
    // Enforce max nesting depth of 1: sub-tasks cannot have sub-tasks
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Sub-tasks cannot have sub-tasks (max nesting depth is 1)" },
        { status: 400 }
      );
    }
  }

  // Get next position
  const lastStory = await prisma.story.findFirst({
    where: { projectId, status: data.status || "BACKLOG" },
    orderBy: { position: "desc" },
  });
  const position = (lastStory?.position ?? -1) + 1;

  // Look up project orgId for issue numbering and activity
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  // Generate shortId using org-level atomic counter for sequential issue numbering
  let shortId: string;
  let identifier: string | undefined;

  if (project?.orgId) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.update({
          where: { id: project.orgId! },
          data: { issueCounter: { increment: 1 } },
          select: { issueCounter: true, issuePrefix: true, name: true },
        });
        const prefix = org.issuePrefix || org.name.substring(0, 2).toUpperCase();
        const id = `${prefix}-${String(org.issueCounter).padStart(3, "0")}`;
        return id;
      }, { isolationLevel: "Serializable" });
      shortId = result;
      identifier = result;
    } catch {
      // Fallback: use global max query if transaction fails
      const maxResult = await prisma.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING("shortId" FROM '[0-9]+') AS INTEGER)) as max_num
        FROM "Story"
      `;
      const nextNum = (maxResult[0]?.max_num ?? 0) + 1;
      shortId = `CP-${String(nextNum).padStart(3, "0")}`;
    }
  } else {
    // No org: fallback to global counter
    const maxResult = await prisma.$queryRaw<[{ max_num: number | null }]>`
      SELECT MAX(CAST(SUBSTRING("shortId" FROM '[0-9]+') AS INTEGER)) as max_num
      FROM "Story"
    `;
    const nextNum = (maxResult[0]?.max_num ?? 0) + 1;
    shortId = `CP-${String(nextNum).padStart(3, "0")}`;
  }

  let story;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      story = await prisma.story.create({
        data: {
          shortId: attempt === 0 ? shortId : `${shortId}-${attempt}`,
          identifier,
          title: data.title,
          description: data.description,
          rawInput: data.rawInput,
          userStory: data.userStory,
          status: data.status || "BACKLOG",
          priority: data.priority || "MEDIUM",
          storyPoints: data.storyPoints,
          position,
          projectId,
          sprintId: data.sprintId,
          assigneeId: data.assigneeId,
          parentId: data.parentId,
          acceptanceCriteria: data.acceptanceCriteria
            ? {
                create: data.acceptanceCriteria.map((ac, i) => ({
                  given: ac.given,
                  when: ac.when,
                  then: ac.then,
                  position: i,
                })),
              }
            : undefined,
          labels: data.labelIds
            ? { create: data.labelIds.map((labelId) => ({ labelId })) }
            : undefined,
        },
        include: {
          labels: { include: { label: true } },
          acceptanceCriteria: true,
          assignee: { select: { id: true, name: true, image: true } },
        },
      });
      break; // success
    } catch (e: unknown) {
      const isPrismaUniqueError = typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
      if (isPrismaUniqueError && attempt < 9) {
        continue;
      }
      throw e;
    }
  }

  if (!story) {
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }

  // Create activity
  await prisma.activity.create({
    data: {
      type: "STORY_CREATED",
      message: `Created story: ${story.title}`,
      projectId,
      storyId: story.id,
      userId: access.type === "session" ? access.userId : null,
      orgId: project?.orgId,
    },
  });

  // Dispatch webhook
  dispatchWebhook(projectId, "story.created", {
    storyId: story.id,
    shortId: story.shortId,
    title: story.title,
    status: story.status,
    priority: story.priority,
  }).catch(console.error);

  // Check if the agent queue should pick up this or another story
  processNextStory(projectId).catch(console.error);

  return NextResponse.json(story);
}
