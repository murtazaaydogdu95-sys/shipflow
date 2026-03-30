export const TEST_USER = {
  id: "test-user-id",
  name: "Test User",
  email: "test@codepylot.dev",
  password: "testpassword123",
  image: null,
  orgId: "test-org-id",
} as const;

export const TEST_ORG = {
  id: "test-org-id",
  name: "Test Workspace",
  slug: "test-workspace",
  plan: "PRO",
} as const;

export const TEST_PROJECT = {
  id: "test-project-id",
  name: "Test Project",
  slug: "test-project",
  description: "A test project for E2E testing",
  techStack: "Next.js, TypeScript, Prisma",
} as const;

export const TEST_STORIES = {
  icebox1: {
    id: "story-icebox-1",
    shortId: "SF-001",
    title: "Explore WebSocket integration",
    status: "ICEBOX",
    priority: "LOW",
    type: "feature",
  },
  backlog1: {
    id: "story-backlog-1",
    shortId: "SF-002",
    title: "Add dark mode toggle",
    status: "BACKLOG",
    priority: "MEDIUM",
    type: "feature",
    storyPoints: 3,
  },
  backlog2: {
    id: "story-backlog-2",
    shortId: "SF-003",
    title: "Fix mobile responsive layout",
    status: "BACKLOG",
    priority: "HIGH",
    type: "bug",
    storyPoints: 2,
  },
  todo1: {
    id: "story-todo-1",
    shortId: "SF-004",
    title: "Implement user settings page",
    status: "TODO",
    priority: "HIGH",
    type: "feature",
    storyPoints: 5,
  },
  todo2: {
    id: "story-todo-2",
    shortId: "SF-005",
    title: "Add input validation for forms",
    status: "TODO",
    priority: "MEDIUM",
    type: "chore",
    storyPoints: 3,
  },
  inProgress1: {
    id: "story-inprogress-1",
    shortId: "SF-006",
    title: "Build notification system",
    status: "IN_PROGRESS",
    priority: "HIGH",
    type: "feature",
    storyPoints: 8,
  },
  review1: {
    id: "story-review-1",
    shortId: "SF-007",
    title: "Implement search functionality",
    status: "REVIEW",
    priority: "CRITICAL",
    type: "feature",
    storyPoints: 5,
    assignedToAgent: true,
    agentStatus: "COMPLETED",
    branchName: "feat/SF-007-search",
    commitHash: "abc1234",
  },
  done1: {
    id: "story-done-1",
    shortId: "SF-008",
    title: "Setup project scaffolding",
    status: "DONE",
    priority: "HIGH",
    type: "chore",
    storyPoints: 2,
  },
  done2: {
    id: "story-done-2",
    shortId: "SF-009",
    title: "Configure CI/CD pipeline",
    status: "DONE",
    priority: "MEDIUM",
    type: "chore",
    storyPoints: 3,
  },
} as const;

export const TEST_SPRINT = {
  active: {
    id: "sprint-active",
    name: "Sprint 1",
    goal: "Complete core features",
    status: "ACTIVE",
  },
  planning: {
    id: "sprint-planning",
    name: "Sprint 2",
    goal: "Polish and deploy",
    status: "PLANNING",
  },
} as const;

export const TEST_LABELS = {
  frontend: { id: "label-frontend", name: "frontend", color: "#3b82f6" },
  backend: { id: "label-backend", name: "backend", color: "#10b981" },
  urgent: { id: "label-urgent", name: "urgent", color: "#ef4444" },
} as const;

export const TEST_ADMIN_USER = {
  id: "test-admin-id",
  name: "Admin User",
  email: "admin@codepylot.dev",
  password: "adminpassword123",
  orgId: "test-org-id",
} as const;

export const TEST_MEMBER_USER = {
  id: "test-member-id",
  name: "Member User",
  email: "member@codepylot.dev",
  password: "memberpassword123",
  orgId: "test-org-id",
} as const;

export const TEST_NEW_USER = {
  id: "test-new-user-id",
  name: "New User",
  email: "newuser@codepylot.dev",
  password: "newuserpassword123",
} as const;

export const TEST_ORG_2 = {
  id: "test-org-2-id",
  name: "Second Workspace",
  slug: "second-workspace",
  plan: "FREE",
} as const;

export const TEST_PUBLIC_PROJECT = {
  id: "test-public-project-id",
  name: "Public Project",
  slug: "public-project",
  description: "A publicly visible project",
} as const;

/**
 * Creates a mock story matching the StoryWithRelations shape returned by the API.
 * Includes all required Prisma relation fields as empty arrays/null.
 */
export function makeStory(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as string) || `story-${Date.now()}`;
  return {
    id,
    shortId: `SF-${Math.floor(Math.random() * 900) + 100}`,
    title: "Test Story",
    description: null,
    rawInput: null,
    userStory: null,
    status: "BACKLOG",
    priority: "MEDIUM",
    type: "feature",
    storyPoints: null,
    position: 0,
    projectId: TEST_PROJECT.id,
    sprintId: null,
    assigneeId: null,
    parentId: null,
    assignedToAgent: false,
    agentNotes: null,
    agentStatus: null,
    agentTriggeredAt: null,
    branchName: null,
    commitHash: null,
    prUrl: null,
    previewPort: null,
    previewPid: null,
    aiReviewScore: null,
    aiReviewResult: null,
    aiReviewedAt: null,
    deployStatus: null,
    deployUrl: null,
    deployedAt: null,
    labels: [],
    acceptanceCriteria: [],
    blockedByDeps: [],
    blockingDeps: [],
    children: [],
    assignee: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
