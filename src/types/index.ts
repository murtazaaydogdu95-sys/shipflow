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
} from "@prisma/client";

export type StoryWithRelations = Story & {
  labels: (StoryLabel & { label: Label })[];
  acceptanceCriteria: AcceptanceCriterion[];
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
export type StoryStatus = (typeof STORY_STATUSES)[number];

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STORY_TYPES = ["feature", "bug", "chore", "refactor", "docs", "test"] as const;
export type StoryType = (typeof STORY_TYPES)[number];

export const SPRINT_STATUSES = ["PLANNING", "ACTIVE", "COMPLETED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const COLUMN_TITLES: Record<StoryStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};
