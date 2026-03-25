import { vi } from "vitest";

function modelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
  };
}

export function createMockPrisma() {
  const mock = {
    story: modelMock(),
    project: modelMock(),
    user: modelMock(),
    orgMember: modelMock(),
    organization: modelMock(),
    projectMember: modelMock(),
    acceptanceCriterion: modelMock(),
    activity: modelMock(),
    comment: modelMock(),
    notification: modelMock(),
    subscription: modelMock(),
    label: modelMock(),
    storyLabel: modelMock(),
    webhook: modelMock(),
    webhookDelivery: modelMock(),
    auditLog: modelMock(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };

  // $transaction calls the callback with the mock itself as `tx`
  mock.$transaction.mockImplementation(async (cb: (tx: typeof mock) => unknown) => cb(mock));

  return mock;
}

export const mockPrisma = createMockPrisma();

export function resetAllMocks() {
  const reset = (obj: Record<string, unknown>) => {
    for (const value of Object.values(obj)) {
      if (typeof value === "function" && "mockReset" in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        reset(value as Record<string, unknown>);
      }
    }
  };
  reset(mockPrisma);
  // Re-install $transaction default
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma));
}

// ── Data factories ───────────────────────────────────────────

export function makeUserData(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: null,
    ...overrides,
  };
}

export function makeProjectData(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    name: "Test Project",
    slug: "test-project",
    orgId: "org-1",
    apiKey: null,
    apiKeyHash: null,
    ...overrides,
  };
}

export function makeStoryData(overrides: Record<string, unknown> = {}) {
  return {
    id: "story-1",
    shortId: "CP-001",
    title: "Test Story",
    description: "A test story",
    status: "BACKLOG",
    priority: "MEDIUM",
    type: "feature",
    position: 0,
    storyPoints: null,
    projectId: "project-1",
    sprintId: null,
    assigneeId: null,
    parentId: null,
    agentStatus: null,
    agentNotes: null,
    assignedToAgent: false,
    commitHash: null,
    branchName: null,
    previewPort: null,
    previewPid: null,
    rawInput: null,
    userStory: null,
    reviewScore: null,
    reviewIssues: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

export function makeOrgMemberData(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    orgId: "org-1",
    role: "OWNER",
    ...overrides,
  };
}
