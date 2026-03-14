import type { StoryStatus } from "@/types";

/**
 * Valid story status transitions.
 * Agent system (agent-trigger.ts) updates status directly via Prisma — trusted internal caller.
 */
const VALID_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  ICEBOX: ["BACKLOG", "TODO"],
  BACKLOG: ["ICEBOX", "TODO"],
  TODO: ["BACKLOG", "ICEBOX", "IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "REVIEW", "DONE"],
  REVIEW: ["IN_PROGRESS", "TODO", "DONE"],
  DONE: ["REVIEW", "TODO"],
};

export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as StoryStatus];
  if (!allowed) return false;
  return allowed.includes(to as StoryStatus);
}

export function getValidTransitions(from: string): StoryStatus[] {
  return VALID_TRANSITIONS[from as StoryStatus] ?? [];
}
