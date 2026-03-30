import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules that route.ts imports transitively (Next.js / NextAuth / Prisma)
vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: { json: vi.fn() },
}));
vi.mock("@/lib/api-auth", () => ({
  requireProjectAccess: vi.fn(),
  unauthorizedResponse: vi.fn(),
}));
vi.mock("@/lib/api-error", () => ({
  sanitizeError: vi.fn((e: unknown) => String(e)),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { computeBurndownData } from "./route";

/**
 * Unit tests for the computeBurndownData pure function.
 *
 * We freeze Date to 2026-01-15 so "today" is deterministic.
 * Sprint dates are chosen relative to that anchor.
 */

function makeSprint(overrides: Partial<{ id: string; name: string; startDate: Date; endDate: Date }> = {}) {
  return {
    id: "sprint-1",
    name: "Sprint 1",
    startDate: new Date("2026-01-10T00:00:00Z"),
    endDate: new Date("2026-01-20T00:00:00Z"),
    ...overrides,
  };
}

type StoryInput = { id: string; storyPoints: number | null; status: string };
type ActivityInput = { storyId: string; message: string; createdAt: Date };

describe("computeBurndownData", () => {
  beforeEach(() => {
    // Freeze time to 2026-01-15T12:00:00Z (mid-sprint)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes correct ideal + actual burndown lines for a sprint with stories", () => {
    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 5, status: "DONE" },
      { id: "s2", storyPoints: 3, status: "IN_PROGRESS" },
      { id: "s3", storyPoints: 2, status: "TODO" },
    ];
    const activities: ActivityInput[] = [
      { storyId: "s1", message: "Moved from IN_PROGRESS to DONE", createdAt: new Date("2026-01-13T10:00:00Z") },
    ];

    const result = computeBurndownData(sprint, stories, activities);

    // Total points: 5 + 3 + 2 = 10
    expect(result.sprint.totalPoints).toBe(10);
    expect(result.dataPoints.length).toBe(11); // 10-day sprint = 11 data points (day 0 through day 10)

    // Day 0 (Jan 10): ideal = 10, actual = 10 (nothing done yet; s1 moved on Jan 13)
    expect(result.dataPoints[0].date).toBe("2026-01-10");
    expect(result.dataPoints[0].idealRemaining).toBe(10);
    expect(result.dataPoints[0].actualRemaining).toBe(10);

    // Day 3 (Jan 13): s1 moved to DONE (5 pts completed), actual = 10 - 5 = 5
    expect(result.dataPoints[3].date).toBe("2026-01-13");
    expect(result.dataPoints[3].actualRemaining).toBe(5);

    // Ideal line decreases linearly
    expect(result.dataPoints[5].idealRemaining).toBe(5); // halfway
    expect(result.dataPoints[10].idealRemaining).toBe(0); // end

    // Future dates (after Jan 15) should have actualRemaining = null
    // Day 6 is Jan 16 which is in the future
    expect(result.dataPoints[6].actualRemaining).toBeNull();
    expect(result.dataPoints[10].actualRemaining).toBeNull();
  });

  it("returns totalPoints 0 and all zeros for a sprint with no stories", () => {
    const sprint = makeSprint();
    const result = computeBurndownData(sprint, [], []);

    expect(result.sprint.totalPoints).toBe(0);
    expect(result.summary.totalPoints).toBe(0);
    expect(result.summary.completedPoints).toBe(0);
    expect(result.summary.remainingPoints).toBe(0);

    // All ideal and actual remaining should be 0
    for (const dp of result.dataPoints) {
      expect(dp.idealRemaining).toBe(0);
      if (dp.actualRemaining !== null) {
        expect(dp.actualRemaining).toBe(0);
      }
    }
  });

  it("treats null storyPoints as 0", () => {
    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: null, status: "TODO" },
      { id: "s2", storyPoints: 5, status: "TODO" },
      { id: "s3", storyPoints: null, status: "DONE" },
    ];

    const result = computeBurndownData(sprint, stories, []);

    expect(result.sprint.totalPoints).toBe(5);
    expect(result.summary.totalPoints).toBe(5);
    // s3 is DONE but has null points, so completedPoints = 0
    expect(result.summary.completedPoints).toBe(0);
  });

  it("drops actualRemaining when a story moves to DONE mid-sprint", () => {
    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 8, status: "DONE" },
    ];
    const activities: ActivityInput[] = [
      { storyId: "s1", message: "Moved from IN_PROGRESS to DONE", createdAt: new Date("2026-01-12T15:00:00Z") },
    ];

    const result = computeBurndownData(sprint, stories, activities);

    // Day 0,1 (Jan 10, Jan 11): before completion, actual = 8
    expect(result.dataPoints[0].actualRemaining).toBe(8);
    expect(result.dataPoints[1].actualRemaining).toBe(8);
    // Day 2 (Jan 12): story completed, actual = 0
    expect(result.dataPoints[2].actualRemaining).toBe(0);
    // Day 3+ should also be 0 (until future)
    expect(result.dataPoints[3].actualRemaining).toBe(0);
  });

  it("increases actualRemaining when a story is reverted from DONE", () => {
    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 5, status: "IN_PROGRESS" },
    ];
    const activities: ActivityInput[] = [
      // Moved to DONE on Jan 12
      { storyId: "s1", message: "Moved from IN_PROGRESS to DONE", createdAt: new Date("2026-01-12T10:00:00Z") },
      // Reverted on Jan 14
      { storyId: "s1", message: "Moved from DONE to IN_PROGRESS", createdAt: new Date("2026-01-14T10:00:00Z") },
    ];

    const result = computeBurndownData(sprint, stories, activities);

    // Day 0,1: not done, actual = 5
    expect(result.dataPoints[0].actualRemaining).toBe(5);
    expect(result.dataPoints[1].actualRemaining).toBe(5);
    // Day 2 (Jan 12): done, actual = 0
    expect(result.dataPoints[2].actualRemaining).toBe(0);
    // Day 3 (Jan 13): still done (reverted on Jan 14), actual = 0
    expect(result.dataPoints[3].actualRemaining).toBe(0);
    // Day 4 (Jan 14): reverted, actual = 5
    expect(result.dataPoints[4].actualRemaining).toBe(5);
    // Day 5 (Jan 15 = today): still not done, actual = 5
    expect(result.dataPoints[5].actualRemaining).toBe(5);
  });

  it("returns actualRemaining null for future dates when sprint has not finished", () => {
    // Sprint entirely in the future
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"));

    const sprint = makeSprint({
      startDate: new Date("2026-01-10T00:00:00Z"),
      endDate: new Date("2026-01-20T00:00:00Z"),
    });
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 5, status: "TODO" },
    ];

    const result = computeBurndownData(sprint, stories, []);

    // All dates are in the future, so all actualRemaining should be null
    for (const dp of result.dataPoints) {
      expect(dp.actualRemaining).toBeNull();
    }
  });

  it("provides all actual data points when sprint is fully completed (all past)", () => {
    // Set time to after sprint ends
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));

    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 5, status: "DONE" },
      { id: "s2", storyPoints: 3, status: "DONE" },
    ];
    const activities: ActivityInput[] = [
      { storyId: "s1", message: "Moved from IN_PROGRESS to DONE", createdAt: new Date("2026-01-14T10:00:00Z") },
      { storyId: "s2", message: "Moved from IN_PROGRESS to DONE", createdAt: new Date("2026-01-18T10:00:00Z") },
    ];

    const result = computeBurndownData(sprint, stories, activities);

    // No null actualRemaining values since all dates are in the past
    for (const dp of result.dataPoints) {
      expect(dp.actualRemaining).not.toBeNull();
    }

    // Last data point should be 0 (all done)
    const lastPoint = result.dataPoints[result.dataPoints.length - 1];
    expect(lastPoint.actualRemaining).toBe(0);
  });

  it("handles a single-day sprint with two data points", () => {
    const sprint = makeSprint({
      startDate: new Date("2026-01-12T00:00:00Z"),
      endDate: new Date("2026-01-12T23:59:59Z"),
    });
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 3, status: "TODO" },
    ];

    const result = computeBurndownData(sprint, stories, []);

    // totalDays = Math.max(1, ceil((end - start) / dayMs)) = 1
    // So we get day 0 and day 1 = 2 data points
    expect(result.dataPoints.length).toBe(2);
    expect(result.dataPoints[0].idealRemaining).toBe(3);
    expect(result.dataPoints[1].idealRemaining).toBe(0);
  });

  it("computes summary stats correctly", () => {
    // Time is mid-sprint (Jan 15)
    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 5, status: "DONE" },
      { id: "s2", storyPoints: 3, status: "IN_PROGRESS" },
      { id: "s3", storyPoints: 2, status: "TODO" },
    ];

    const result = computeBurndownData(sprint, stories, []);

    expect(result.summary.totalPoints).toBe(10);
    expect(result.summary.completedPoints).toBe(5); // s1 is DONE
    expect(result.summary.remainingPoints).toBe(5); // 10 - 5
    expect(result.summary.daysTotal).toBe(10); // 10-day sprint
    // daysElapsed: ceil((Jan15 23:59:59.999 - Jan10) / dayMs) = ceil(5.999..) = 6, capped at 10
    expect(result.summary.daysElapsed).toBe(6);
    expect(result.summary.daysRemaining).toBe(4); // 10 - 6
  });

  it("returns correct sprint metadata in the response", () => {
    const sprint = makeSprint({ id: "sp-42", name: "Alpha Sprint" });
    const result = computeBurndownData(sprint, [], []);

    expect(result.sprint.id).toBe("sp-42");
    expect(result.sprint.name).toBe("Alpha Sprint");
    expect(result.sprint.startDate).toBe(sprint.startDate.toISOString());
    expect(result.sprint.endDate).toBe(sprint.endDate.toISOString());
  });

  it("handles stories with no activity that are currently DONE (fallback to current status)", () => {
    // Time is after sprint so all days are past
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));

    const sprint = makeSprint();
    const stories: StoryInput[] = [
      { id: "s1", storyPoints: 4, status: "DONE" },
    ];
    // No activities at all — the function should check current status
    const result = computeBurndownData(sprint, stories, []);

    // Since there's no activity, it checks story.status === "DONE"
    // so every past day treats s1 as completed
    for (const dp of result.dataPoints) {
      expect(dp.actualRemaining).toBe(0);
    }
  });
});
