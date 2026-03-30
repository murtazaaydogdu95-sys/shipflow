import { prisma } from "@/lib/prisma";

/**
 * Calculate progress for a goal based on linked stories.
 * Includes stories from child goals recursively (max 3 levels).
 */
export async function calculateGoalProgress(goalId: string): Promise<{
  totalStories: number;
  completedStories: number;
  percentage: number;
}> {
  const goalIds = await collectGoalIds(goalId, 3);

  const [totalStories, completedStories] = await Promise.all([
    prisma.story.count({
      where: { goalId: { in: goalIds } },
    }),
    prisma.story.count({
      where: { goalId: { in: goalIds }, status: "DONE" },
    }),
  ]);

  const percentage = totalStories > 0
    ? Math.round((completedStories / totalStories) * 100)
    : 0;

  return { totalStories, completedStories, percentage };
}

/**
 * Collect a goal's ID and all descendant goal IDs up to maxDepth levels.
 */
async function collectGoalIds(goalId: string, maxDepth: number): Promise<string[]> {
  const ids: string[] = [goalId];
  let currentLevel = [goalId];

  for (let depth = 0; depth < maxDepth && currentLevel.length > 0; depth++) {
    const children = await prisma.goal.findMany({
      where: { parentId: { in: currentLevel } },
      select: { id: true },
    });
    const childIds = children.map((c: { id: string }) => c.id);
    ids.push(...childIds);
    currentLevel = childIds;
  }

  return ids;
}

/**
 * Detect if setting parentId would create a cycle in the goal hierarchy.
 * Walks up from parentId and checks if goalId appears (max 10 hops).
 */
export async function detectGoalCycle(goalId: string, parentId: string): Promise<boolean> {
  let currentId: string | null = parentId;
  const maxHops = 10;

  for (let i = 0; i < maxHops && currentId; i++) {
    if (currentId === goalId) return true;

    const parent: { parentId: string | null } | null = await prisma.goal.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = parent?.parentId ?? null;
  }

  return false;
}

/**
 * Get the depth of a goal in the hierarchy (0 = root).
 */
async function getGoalDepth(goalId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = goalId;
  const maxHops = 10;

  for (let i = 0; i < maxHops && currentId; i++) {
    const goal: { parentId: string | null } | null = await prisma.goal.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!goal?.parentId) break;
    currentId = goal.parentId;
    depth++;
  }

  return depth;
}

/**
 * Validate that adding a child under parentId won't exceed max depth of 3.
 */
export async function validateMaxDepth(parentId: string): Promise<boolean> {
  const parentDepth = await getGoalDepth(parentId);
  return parentDepth < 2; // parent is at depth 0 or 1, child would be at 1 or 2 (max depth index 2 = 3 levels)
}

/**
 * Get goal context for agent prompt injection.
 * If story has a goalId, returns a formatted context string.
 */
export async function getGoalContext(storyId: string): Promise<string | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { goalId: true },
  });

  if (!story?.goalId) return null;

  const goal = await prisma.goal.findUnique({
    where: { id: story.goalId },
    select: { title: true, description: true, level: true },
  });

  if (!goal) return null;

  const parts = [
    `\nGOAL ALIGNMENT: This story is linked to a ${goal.level}-level goal.`,
    `Goal: "${goal.title}"`,
  ];

  if (goal.description) {
    parts.push(`Goal Description: ${goal.description}`);
  }

  parts.push(
    `Ensure your implementation aligns with this goal. Consider how your changes contribute to achieving it.`
  );

  return parts.join("\n");
}
