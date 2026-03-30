import { NextRequest, NextResponse } from "next/server";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { sanitizeError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import type { BurndownDataPoint, BurndownSummary, BurndownResponse } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; sprintId: string }> }
) {
  try {
    const { projectId, sprintId } = await params;
    const access = await requireProjectAccess(req, projectId);
    if (!access) return unauthorizedResponse();

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || sprint.projectId !== projectId) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }
    if (!sprint.startDate || !sprint.endDate) {
      return NextResponse.json(
        { error: "Sprint must have start and end dates" },
        { status: 422 }
      );
    }

    const stories = await prisma.story.findMany({
      where: { sprintId },
      select: { id: true, storyPoints: true, status: true },
    });

    const storyIds = stories.map((s) => s.id);
    const activities =
      storyIds.length > 0
        ? await prisma.activity.findMany({
            where: { storyId: { in: storyIds }, type: "STORY_MOVED" },
            orderBy: { createdAt: "asc" },
            select: { storyId: true, message: true, createdAt: true },
          })
        : [];

    // Filter out activities with null storyId (shouldn't happen for STORY_MOVED)
    const filteredActivities = activities.filter(
      (a): a is typeof a & { storyId: string } => a.storyId !== null
    );

    const response = computeBurndownData(
      {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      stories,
      filteredActivities
    );
    return NextResponse.json(response);
  } catch (err) {
    const msg = sanitizeError(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Pure function to compute burndown chart data from sprint, stories, and activities.
 * Exported for unit testing.
 */
export function computeBurndownData(
  sprint: { id: string; name: string; startDate: Date; endDate: Date },
  stories: Array<{ id: string; storyPoints: number | null; status: string }>,
  activities: Array<{ storyId: string; message: string; createdAt: Date }>
): BurndownResponse {
  const totalPoints = stories.reduce(
    (sum, s) => sum + (s.storyPoints ?? 0),
    0
  );
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Build per-story event timeline
  const MOVE_REGEX = /Moved from (\S+) to (\S+)/;
  const storyEvents = new Map<
    string,
    Array<{ date: Date; isDone: boolean }>
  >();

  for (const act of activities) {
    const match = act.message.match(MOVE_REGEX);
    if (!match) continue;
    const [, , newStatus] = match;
    const oldStatus = match[1];
    const events = storyEvents.get(act.storyId) ?? [];
    if (newStatus === "DONE") {
      events.push({ date: act.createdAt, isDone: true });
    } else if (oldStatus === "DONE") {
      events.push({ date: act.createdAt, isDone: false });
    }
    storyEvents.set(act.storyId, events);
  }

  // Generate daily data points
  const dataPoints: BurndownDataPoint[] = [];
  const totalDays = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    const idealRemaining =
      Math.round(totalPoints * (1 - dayOffset / totalDays) * 100) / 100;
    const isFuture = date > today;

    if (isFuture) {
      dataPoints.push({ date: dateStr, idealRemaining, actualRemaining: null });
      continue;
    }

    // Compute completed points as of end-of-day
    let completedPoints = 0;
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    for (const story of stories) {
      const events = storyEvents.get(story.id);
      const points = story.storyPoints ?? 0;
      if (points === 0) continue;

      if (!events || events.length === 0) {
        // No activity: check current status
        if (story.status === "DONE") completedPoints += points;
        continue;
      }

      // Find latest event on or before this day
      let isDone = false;
      for (const event of events) {
        if (event.date <= endOfDay) isDone = event.isDone;
      }
      if (isDone) completedPoints += points;
    }

    dataPoints.push({
      date: dateStr,
      idealRemaining,
      actualRemaining: totalPoints - completedPoints,
    });
  }

  // Compute summary
  const completedPoints = stories
    .filter((s) => s.status === "DONE")
    .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
  const daysElapsed = Math.min(
    totalDays,
    Math.max(
      0,
      Math.ceil(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    )
  );

  const summary: BurndownSummary = {
    totalPoints,
    completedPoints,
    remainingPoints: totalPoints - completedPoints,
    daysTotal: totalDays,
    daysElapsed,
    daysRemaining: Math.max(0, totalDays - daysElapsed),
  };

  return {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      totalPoints,
    },
    dataPoints,
    summary,
  };
}
