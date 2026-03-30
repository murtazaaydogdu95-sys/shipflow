import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/api-error";
import { checkBudget } from "@/lib/budget-check";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CronExpressionParser } = require("cron-parser");

interface StoryTemplate {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  storyPoints?: number | null;
  labels?: string[];
}

interface RoutineRecord {
  id: string;
  projectId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  concurrencyPolicy: string;
  storyTemplate: unknown;
  nextTriggerAt: Date | null;
  lastTriggeredAt: Date | null;
  active: boolean;
}

/**
 * Compute the next trigger time for a given cron expression and timezone.
 */
export function computeNextTriggerTime(cronExpression: string, timezone: string): Date {
  const interval = CronExpressionParser.parse(cronExpression, {
    tz: timezone,
    currentDate: new Date(),
  });
  const next = interval.next();
  return next.toDate();
}

/**
 * Apply concurrency policy to determine if a routine should create a new story.
 */
export async function applyConcurrencyPolicy(routine: RoutineRecord): Promise<{
  allowed: boolean;
  action: "create" | "skip" | "coalesce";
  existingStoryId?: string;
  skipReason?: string;
}> {
  if (routine.concurrencyPolicy === "always_enqueue") {
    return { allowed: true, action: "create" };
  }

  // Check for active stories from this routine (via RoutineRun)
  const activeRuns = await prisma.routineRun.findMany({
    where: {
      routineId: routine.id,
      status: { in: ["pending", "running"] },
    },
    select: { id: true, storyId: true, status: true },
    take: 1,
  });

  if (activeRuns.length === 0) {
    return { allowed: true, action: "create" };
  }

  if (routine.concurrencyPolicy === "skip_if_active") {
    return {
      allowed: false,
      action: "skip",
      existingStoryId: activeRuns[0].storyId ?? undefined,
      skipReason: `Active run exists (${activeRuns[0].id})`,
    };
  }

  if (routine.concurrencyPolicy === "coalesce_if_active") {
    // If there's already a pending run, skip; if running, allow one pending
    const pendingRun = activeRuns.find((r) => r.status === "pending");
    if (pendingRun) {
      return {
        allowed: false,
        action: "skip",
        existingStoryId: pendingRun.storyId ?? undefined,
        skipReason: "Pending run already exists (coalesce)",
      };
    }
    return { allowed: true, action: "coalesce" };
  }

  return { allowed: true, action: "create" };
}

/**
 * Evaluate all active routines and trigger stories for those that are due.
 * Returns the count of triggered routines.
 */
export async function evaluateRoutineTriggers(): Promise<number> {
  const now = new Date();

  const dueRoutines = await prisma.routine.findMany({
    where: {
      active: true,
      nextTriggerAt: { lte: now },
    },
    include: {
      project: { select: { orgId: true } },
    },
  });

  let triggered = 0;

  for (const routine of dueRoutines) {
    try {
      const policy = await applyConcurrencyPolicy(routine as RoutineRecord);

      if (!policy.allowed) {
        // Record a skipped run
        await prisma.routineRun.create({
          data: {
            routineId: routine.id,
            source: "scheduled",
            status: "skipped",
            skipReason: policy.skipReason ?? "Concurrency policy blocked",
          },
        });

        // Still update nextTriggerAt
        const nextTrigger = computeNextTriggerTime(
          routine.cronExpression,
          routine.timezone
        );
        await prisma.routine.update({
          where: { id: routine.id },
          data: {
            nextTriggerAt: nextTrigger,
            lastTriggeredAt: now,
          },
        });
        continue;
      }

      // Check budget for the project's org before creating a story
      if (routine.project?.orgId) {
        const budgetResult = await checkBudget("", routine.projectId, routine.project.orgId);
        if (!budgetResult.allowed) {
          await prisma.routineRun.create({
            data: {
              routineId: routine.id,
              source: "scheduled",
              status: "skipped",
              skipReason: budgetResult.reason || "Budget exceeded",
            },
          });
          const nextTrigger = computeNextTriggerTime(routine.cronExpression, routine.timezone);
          await prisma.routine.update({
            where: { id: routine.id },
            data: { nextTriggerAt: nextTrigger, lastTriggeredAt: now },
          });
          continue;
        }
      }

      const template = routine.storyTemplate as unknown as StoryTemplate;

      // Use a serializable transaction to prevent duplicate shortIds
      await prisma.$transaction(
        async (tx) => {
          const maxResult = await tx.$queryRaw<[{ max_num: number | null }]>`
            SELECT MAX(CAST(SUBSTRING("shortId" FROM 4) AS INTEGER)) as max_num
            FROM "Story"
          `;
          const seq = (maxResult[0]?.max_num ?? 0) + 1;
          const shortId = `CP-${String(seq).padStart(3, "0")}`;

          const story = await tx.story.create({
            data: {
              shortId,
              title: template.title,
              description: template.description ?? null,
              status: "TODO",
              priority: template.priority ?? "MEDIUM",
              type: template.type ?? "chore",
              storyPoints: template.storyPoints ?? null,
              projectId: routine.projectId,
              routineId: routine.id,
            },
          });

          await tx.routineRun.create({
            data: {
              routineId: routine.id,
              source: "scheduled",
              status: "completed",
              storyId: story.id,
            },
          });

          const nextTrigger = computeNextTriggerTime(
            routine.cronExpression,
            routine.timezone
          );
          await tx.routine.update({
            where: { id: routine.id },
            data: {
              nextTriggerAt: nextTrigger,
              lastTriggeredAt: now,
            },
          });
        },
        { isolationLevel: "Serializable" }
      );

      triggered++;
    } catch (err) {
      console.error(
        `[routine-engine] Failed to trigger routine ${routine.id}:`,
        sanitizeError(err, "Routine trigger failed")
      );
    }
  }

  return triggered;
}

/**
 * Trigger a routine manually (on-demand) or via webhook.
 */
export async function triggerRoutineManually(
  routineId: string,
  source: "on_demand" | "webhook" = "on_demand",
  webhookPayload?: unknown
): Promise<{ runId: string; storyId: string | null; skipped: boolean; skipReason?: string }> {
  const routine = await prisma.routine.findUnique({
    where: { id: routineId },
  });

  if (!routine) {
    throw new Error("Routine not found");
  }

  if (!routine.active) {
    throw new Error("Routine is not active");
  }

  const policy = await applyConcurrencyPolicy(routine as RoutineRecord);

  if (!policy.allowed) {
    const run = await prisma.routineRun.create({
      data: {
        routineId: routine.id,
        source,
        status: "skipped",
        skipReason: policy.skipReason ?? "Concurrency policy blocked",
        webhookPayload: webhookPayload ? (webhookPayload as object) : undefined,
      },
    });
    return { runId: run.id, storyId: null, skipped: true, skipReason: policy.skipReason };
  }

  const template = routine.storyTemplate as unknown as StoryTemplate;
  const now = new Date();

  const result = await prisma.$transaction(
    async (tx) => {
      const maxResult = await tx.$queryRaw<[{ max_num: number | null }]>`
        SELECT MAX(CAST(SUBSTRING("shortId" FROM 4) AS INTEGER)) as max_num
        FROM "Story"
      `;
      const seq = (maxResult[0]?.max_num ?? 0) + 1;
      const shortId = `CP-${String(seq).padStart(3, "0")}`;

      const story = await tx.story.create({
        data: {
          shortId,
          title: template.title,
          description: template.description ?? null,
          status: "TODO",
          priority: template.priority ?? "MEDIUM",
          type: template.type ?? "chore",
          storyPoints: template.storyPoints ?? null,
          projectId: routine.projectId,
          routineId: routine.id,
        },
      });

      const run = await tx.routineRun.create({
        data: {
          routineId: routine.id,
          source,
          status: "completed",
          storyId: story.id,
          webhookPayload: webhookPayload ? (webhookPayload as object) : undefined,
        },
      });

      await tx.routine.update({
        where: { id: routine.id },
        data: { lastTriggeredAt: now },
      });

      return { runId: run.id, storyId: story.id };
    },
    { isolationLevel: "Serializable" }
  );

  return { ...result, skipped: false };
}
