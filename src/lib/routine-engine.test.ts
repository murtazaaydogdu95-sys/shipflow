import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";

// ── Mocks ────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/api-error", () => ({
  sanitizeError: vi.fn((err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback
  ),
}));

vi.mock("@/lib/budget-check", () => ({
  checkBudget: vi.fn().mockResolvedValue({ allowed: true, warnings: [] }),
}));

import { computeNextTriggerTime, applyConcurrencyPolicy } from "./routine-engine";

// ── Helpers ──────────────────────────────────────────────────

interface RoutineData {
  id?: string;
  projectId?: string;
  name?: string;
  cronExpression?: string;
  timezone?: string;
  concurrencyPolicy?: string;
  storyTemplate?: unknown;
  nextTriggerAt?: Date | null;
  lastTriggeredAt?: Date | null;
  active?: boolean;
}

function makeRoutine(overrides: RoutineData = {}) {
  return {
    id: "routine-1",
    projectId: "project-1",
    name: "Daily Standup",
    cronExpression: "0 9 * * *",
    timezone: "UTC",
    concurrencyPolicy: "always_enqueue",
    storyTemplate: { title: "Daily standup review", type: "chore", priority: "MEDIUM" },
    nextTriggerAt: new Date("2026-03-30T09:00:00Z"),
    lastTriggeredAt: null,
    active: true,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("computeNextTriggerTime", () => {
  it("returns a Date object in the future", () => {
    const now = new Date();
    const result = computeNextTriggerTime("0 9 * * *", "UTC");

    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThan(now.getTime());
  });

  it("returns next fire time matching the cron schedule (daily at 9 AM UTC)", () => {
    const result = computeNextTriggerTime("0 9 * * *", "UTC");

    // The next trigger should be at 09:00 hours
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("respects timezone parameter", () => {
    // Both should return valid dates but potentially different times
    const utcResult = computeNextTriggerTime("0 9 * * *", "UTC");
    const nyResult = computeNextTriggerTime("0 9 * * *", "America/New_York");

    expect(utcResult).toBeInstanceOf(Date);
    expect(nyResult).toBeInstanceOf(Date);
    // They represent 9 AM in different timezones, so UTC timestamps will differ
    // (unless it happens to be exactly the right time for them to coincide)
    expect(utcResult.getTime()).not.toEqual(nyResult.getTime());
  });

  it("handles every-5-minutes cron expression", () => {
    const now = new Date();
    const result = computeNextTriggerTime("*/5 * * * *", "UTC");

    // Should be within the next 5 minutes
    const diffMs = result.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThanOrEqual(5 * 60 * 1000 + 1000); // 5 min + 1s tolerance
  });

  it("throws for invalid cron expression", () => {
    expect(() => computeNextTriggerTime("not a cron", "UTC")).toThrow();
  });
});

describe("applyConcurrencyPolicy", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("allows always_enqueue regardless of active stories", async () => {
    const routine = makeRoutine({ concurrencyPolicy: "always_enqueue" });

    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("create");
    // Should not even check for active runs
    expect(mockPrisma.routineRun.findMany).not.toHaveBeenCalled();
  });

  it("allows creation when no active story exists (skip_if_active)", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([]);

    const routine = makeRoutine({ concurrencyPolicy: "skip_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("create");
  });

  it("skips when skip_if_active and active story exists", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([
      { id: "run-1", storyId: "story-active", status: "running" },
    ]);

    const routine = makeRoutine({ concurrencyPolicy: "skip_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(false);
    expect(result.action).toBe("skip");
    expect(result.existingStoryId).toBe("story-active");
    expect(result.skipReason).toContain("Active run exists");
  });

  it("allows coalesce_if_active when only running (no pending) story exists", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([
      { id: "run-1", storyId: "story-running", status: "running" },
    ]);

    const routine = makeRoutine({ concurrencyPolicy: "coalesce_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("coalesce");
  });

  it("skips coalesce_if_active when a pending run already exists", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([
      { id: "run-1", storyId: "story-pending", status: "pending" },
    ]);

    const routine = makeRoutine({ concurrencyPolicy: "coalesce_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(false);
    expect(result.action).toBe("skip");
    expect(result.existingStoryId).toBe("story-pending");
    expect(result.skipReason).toContain("coalesce");
  });

  it("allows when no active story for coalesce_if_active", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([]);

    const routine = makeRoutine({ concurrencyPolicy: "coalesce_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("create");
  });

  it("queries routineRun with correct filters for skip_if_active", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([]);

    const routine = makeRoutine({ id: "routine-42", concurrencyPolicy: "skip_if_active" });
    await applyConcurrencyPolicy(routine);

    expect(mockPrisma.routineRun.findMany).toHaveBeenCalledWith({
      where: {
        routineId: "routine-42",
        status: { in: ["pending", "running"] },
      },
      select: { id: true, storyId: true, status: true },
      take: 1,
    });
  });

  it("defaults to allowed for unknown concurrency policy", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([
      { id: "run-1", storyId: "story-1", status: "running" },
    ]);

    const routine = makeRoutine({ concurrencyPolicy: "unknown_policy" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("create");
  });

  it("handles null storyId in active runs gracefully", async () => {
    mockPrisma.routineRun.findMany.mockResolvedValue([
      { id: "run-1", storyId: null, status: "running" },
    ]);

    const routine = makeRoutine({ concurrencyPolicy: "skip_if_active" });
    const result = await applyConcurrencyPolicy(routine);

    expect(result.allowed).toBe(false);
    expect(result.existingStoryId).toBeUndefined();
  });
});
