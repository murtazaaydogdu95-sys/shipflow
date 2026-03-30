import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";

// ── Mocks ────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// Add goal model to mock if missing
if (!mockPrisma.goal) {
  (mockPrisma as Record<string, unknown>).goal = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const goalMock = (mockPrisma as any).goal;
const storyMock = mockPrisma.story;

describe("goals", () => {
  beforeEach(() => {
    resetAllMocks();
    // Re-add goal mock after reset
    if (!mockPrisma.goal) {
      (mockPrisma as Record<string, unknown>).goal = {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      };
    }
  });

  describe("detectGoalCycle", () => {
    it("returns true for circular reference", async () => {
      const { detectGoalCycle } = await import("./goals");

      // Goal A -> Goal B -> Goal C -> Goal A (cycle)
      // We want to check: can Goal A have parent = Goal C?
      // Walk up from Goal C: C -> (parent B) -> (parent A) -> match!
      goalMock.findUnique
        .mockResolvedValueOnce({ parentId: "goal-b" }) // lookup goal-c -> parent is goal-b
        .mockResolvedValueOnce({ parentId: "goal-a" }); // lookup goal-b -> parent is goal-a

      const hasCycle = await detectGoalCycle("goal-a", "goal-c");

      expect(hasCycle).toBe(true);
    });

    it("returns false for valid hierarchy", async () => {
      const { detectGoalCycle } = await import("./goals");

      // Goal A (root), Goal B (child of A), Goal C (child of B)
      // Check: can Goal D have parent = Goal C? No cycle.
      goalMock.findUnique
        .mockResolvedValueOnce({ parentId: "goal-b" }) // lookup goal-c -> parent is goal-b
        .mockResolvedValueOnce({ parentId: "goal-a" }) // lookup goal-b -> parent is goal-a
        .mockResolvedValueOnce({ parentId: null });     // lookup goal-a -> no parent (root)

      const hasCycle = await detectGoalCycle("goal-d", "goal-c");

      expect(hasCycle).toBe(false);
    });

    it("returns true when parentId equals goalId directly", async () => {
      const { detectGoalCycle } = await import("./goals");

      // Setting a goal as its own parent
      const hasCycle = await detectGoalCycle("goal-a", "goal-a");

      expect(hasCycle).toBe(true);
    });
  });

  describe("validateMaxDepth", () => {
    it("rejects depth > 3 (parent at depth 2 means child would be depth 3)", async () => {
      const { validateMaxDepth } = await import("./goals");

      // Parent is at depth 2 (has grandparent)
      goalMock.findUnique
        .mockResolvedValueOnce({ parentId: "goal-mid" })  // parent -> has parent
        .mockResolvedValueOnce({ parentId: "goal-root" }) // grandparent -> has parent
        .mockResolvedValueOnce({ parentId: null });        // great-grandparent -> root

      const valid = await validateMaxDepth("goal-parent");

      // parentDepth = 2, and 2 < 2 is false, so adding child would exceed max depth
      expect(valid).toBe(false);
    });

    it("allows depth when parent is at depth 0 (root)", async () => {
      const { validateMaxDepth } = await import("./goals");

      // Parent has no parent (depth 0)
      goalMock.findUnique.mockResolvedValueOnce({ parentId: null });

      const valid = await validateMaxDepth("goal-root");

      expect(valid).toBe(true);
    });

    it("allows depth when parent is at depth 1", async () => {
      const { validateMaxDepth } = await import("./goals");

      // Parent has a parent (depth 1)
      goalMock.findUnique
        .mockResolvedValueOnce({ parentId: "goal-root" }) // parent -> has parent
        .mockResolvedValueOnce({ parentId: null });        // grandparent -> root

      const valid = await validateMaxDepth("goal-mid");

      expect(valid).toBe(true);
    });
  });

  describe("getGoalContext", () => {
    it("returns formatted string for goal-linked story", async () => {
      const { getGoalContext } = await import("./goals");

      storyMock.findUnique.mockResolvedValue({ goalId: "goal-1" });
      goalMock.findUnique.mockResolvedValue({
        title: "Increase user retention",
        description: "Improve retention rate by 20%",
        level: "company",
      });

      const context = await getGoalContext("story-1");

      expect(context).not.toBeNull();
      expect(context).toContain("GOAL ALIGNMENT");
      expect(context).toContain("company-level goal");
      expect(context).toContain("Increase user retention");
      expect(context).toContain("Improve retention rate by 20%");
      expect(context).toContain("aligns with this goal");
    });

    it("returns null for story without goal", async () => {
      const { getGoalContext } = await import("./goals");

      storyMock.findUnique.mockResolvedValue({ goalId: null });

      const context = await getGoalContext("story-2");

      expect(context).toBeNull();
    });

    it("returns null when story does not exist", async () => {
      const { getGoalContext } = await import("./goals");

      storyMock.findUnique.mockResolvedValue(null);

      const context = await getGoalContext("nonexistent-story");

      expect(context).toBeNull();
    });

    it("omits description line when goal has no description", async () => {
      const { getGoalContext } = await import("./goals");

      storyMock.findUnique.mockResolvedValue({ goalId: "goal-1" });
      goalMock.findUnique.mockResolvedValue({
        title: "Ship v2",
        description: null,
        level: "team",
      });

      const context = await getGoalContext("story-1");

      expect(context).not.toBeNull();
      expect(context).toContain("team-level goal");
      expect(context).toContain("Ship v2");
      expect(context).not.toContain("Goal Description:");
    });
  });

  describe("calculateGoalProgress", () => {
    it("computes correct percentage", async () => {
      const { calculateGoalProgress } = await import("./goals");

      // No children
      goalMock.findMany.mockResolvedValue([]);

      // 10 total stories, 3 done
      storyMock.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // done

      const result = await calculateGoalProgress("goal-1");

      expect(result.totalStories).toBe(10);
      expect(result.completedStories).toBe(3);
      expect(result.percentage).toBe(30);
    });

    it("returns 0 percentage when no stories linked", async () => {
      const { calculateGoalProgress } = await import("./goals");

      goalMock.findMany.mockResolvedValue([]);
      storyMock.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await calculateGoalProgress("goal-1");

      expect(result.totalStories).toBe(0);
      expect(result.completedStories).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it("includes child goal stories in progress calculation", async () => {
      const { calculateGoalProgress } = await import("./goals");

      // Level 1 children
      goalMock.findMany
        .mockResolvedValueOnce([{ id: "child-1" }, { id: "child-2" }])
        .mockResolvedValueOnce([]) // no grandchildren for child-1, child-2
        ;

      // Total and completed counts include parent + children goals
      storyMock.count
        .mockResolvedValueOnce(20) // total across goal-1, child-1, child-2
        .mockResolvedValueOnce(10); // done

      const result = await calculateGoalProgress("goal-1");

      expect(result.totalStories).toBe(20);
      expect(result.completedStories).toBe(10);
      expect(result.percentage).toBe(50);

      // Verify story.count was called with all goal IDs
      expect(storyMock.count).toHaveBeenCalledWith({
        where: { goalId: { in: ["goal-1", "child-1", "child-2"] } },
      });
    });
  });
});
