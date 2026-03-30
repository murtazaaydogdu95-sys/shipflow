import type {
  Story,
  Sprint,
  Project,
  Label,
  User,
  AcceptanceCriterion,
  Activity,
  StoryLabel,
  ProjectMember,
  Comment,
} from "@prisma/client";

export type StoryWithRelations = Story & {
  labels: (StoryLabel & { label: Label })[];
  acceptanceCriteria: AcceptanceCriterion[];
  assignee?: Pick<User, "id" | "name" | "image"> | null;
  comments?: (Comment & { user: Pick<User, "id" | "name" | "image"> })[];
  parent?: Pick<Story, "id" | "shortId" | "title"> | null;
  children?: Pick<Story, "id" | "shortId" | "title" | "status">[];
  blockedByDeps?: { blocker: Pick<Story, "id" | "shortId" | "title" | "status"> }[];
  blockingDeps?: { blocked: Pick<Story, "id" | "shortId" | "title" | "status"> }[];
  attachments?: { id: string; filename: string; url: string; size: number; mimeType: string; createdAt: Date }[];
};

export type SprintWithStories = Sprint & {
  stories: StoryWithRelations[];
  _count: { stories: number };
};

export type ProjectWithMembers = Project & {
  members: (ProjectMember & { user: Pick<User, "id" | "name" | "image"> })[];
  _count: { stories: number; sprints: number };
};

export type BoardColumn = {
  id: string;
  title: string;
  stories: StoryWithRelations[];
};

export type ActivityWithUser = Activity & {
  user: Pick<User, "id" | "name" | "image"> | null;
};

export const STORY_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export const ALL_STORY_STATUSES = ["ICEBOX", "BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type StoryStatus = (typeof ALL_STORY_STATUSES)[number];

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STORY_TYPES = ["feature", "bug", "chore", "refactor", "docs", "test"] as const;
export type StoryType = (typeof STORY_TYPES)[number];

export const SPRINT_STATUSES = ["PLANNING", "ACTIVE", "COMPLETED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const COLUMN_TITLES: Record<StoryStatus, string> = {
  ICEBOX: "Someday",
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

export const FEED_STATUS_ORDER: StoryStatus[] = ["REVIEW", "IN_PROGRESS", "TODO", "BACKLOG", "ICEBOX", "DONE"];

export const FEED_SECTION_TITLES: Record<StoryStatus, string> = {
  REVIEW: "Needs Review",
  IN_PROGRESS: "In Progress",
  TODO: "Up Next",
  BACKLOG: "Ideas",
  ICEBOX: "Someday",
  DONE: "Completed",
};

export interface BurndownDataPoint {
  date: string;
  idealRemaining: number;
  actualRemaining: number | null;
}

export interface BurndownSummary {
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
}

export interface BurndownResponse {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    totalPoints: number;
  };
  dataPoints: BurndownDataPoint[];
  summary: BurndownSummary;
}
