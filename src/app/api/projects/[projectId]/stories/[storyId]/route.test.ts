import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks, makeStoryData, makeProjectData } from "@/test/mocks/prisma";
import { makeRequest, makeParams, parseResponse } from "@/test/helpers";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/webhooks", () => ({ dispatchWebhook: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/agent-trigger", () => ({ processNextStory: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
  sendNotificationEmail: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  storyAssignedEmail: vi.fn().mockReturnValue({ subject: "Assigned", html: "<p>Assigned</p>" }),
  agentCompletedEmail: vi.fn().mockReturnValue({ subject: "Done", html: "<p>Done</p>" }),
}));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { check: vi.fn().mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }) },
}));

import { GET, PATCH, DELETE } from "./route";
import { dispatchWebhook } from "@/lib/webhooks";
import { processNextStory } from "@/lib/agent-trigger";
import { createNotification } from "@/lib/notifications";

// ── Helpers ──────────────────────────────────────────────────
const PROJECT_ID = "project-1";
const STORY_ID = "story-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/projects/${PROJECT_ID}/stories/${STORY_ID}`;

function mockSessionAuth() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockPrisma.projectMember.findUnique.mockResolvedValue({ role: "OWNER" });
}

function mockUnauthenticated() {
  mockAuth.mockResolvedValue(null);
  mockPrisma.project.findFirst.mockResolvedValue(null);
  mockPrisma.project.findUnique.mockResolvedValue(null);
}

const storyWithRelations = {
  ...makeStoryData(),
  labels: [],
  acceptanceCriteria: [],
  assignee: null,
  parent: null,
  children: [],
  blockedByDeps: [],
  blockingDeps: [],
  attachments: [],
  activities: [],
};

describe("GET /api/projects/[projectId]/stories/[storyId]", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("returns story with relations", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue(storyWithRelations);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.id).toBe("story-1");
    expect(body.labels).toEqual([]);
  });

  it("returns 404 when story not found", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue(null);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: "nonexistent" }));

    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/projects/[projectId]/stories/[storyId]", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSessionAuth();
  });

  function setupPatchMocks(existing = makeStoryData()) {
    mockPrisma.story.findFirst.mockResolvedValue(existing);
    mockPrisma.story.update.mockResolvedValue({ ...existing, ...{ labels: [], acceptanceCriteria: [], assignee: null } });
    mockPrisma.project.findUnique.mockResolvedValue(makeProjectData());
    mockPrisma.activity.create.mockResolvedValue({});
  }

  it("updates story fields", async () => {
    setupPatchMocks();

    const req = makeRequest("PATCH", BASE_URL, { title: "Updated Title", priority: "HIGH" });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    expect(mockPrisma.story.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Updated Title", priority: "HIGH" }),
      })
    );
  });

  it("validates status transitions (422 on invalid)", async () => {
    // Story is BACKLOG, trying to move to DONE (invalid)
    setupPatchMocks(makeStoryData({ status: "BACKLOG" }));

    const req = makeRequest("PATCH", BASE_URL, { status: "DONE" });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(422);
    const body = await parseResponse(res);
    expect(body.error).toContain("Invalid status transition");
    expect(body.validTransitions).toBeDefined();
  });

  it("allows valid status transitions", async () => {
    setupPatchMocks(makeStoryData({ status: "BACKLOG" }));
    mockPrisma.story.update.mockResolvedValue({
      ...makeStoryData({ status: "TODO" }),
      labels: [],
      acceptanceCriteria: [],
      assignee: null,
    });

    const req = makeRequest("PATCH", BASE_URL, { status: "TODO" });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
  });

  it("sends notification when assignee changes", async () => {
    setupPatchMocks(makeStoryData({ assigneeId: null }));
    mockPrisma.story.update.mockResolvedValue({
      ...makeStoryData({ assigneeId: "user-2" }),
      shortId: "CP-001",
      labels: [],
      acceptanceCriteria: [],
      assignee: { id: "user-2", name: "Assignee", image: null },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ email: "assignee@test.com" });

    const req = makeRequest("PATCH", BASE_URL, { assigneeId: "user-2" });
    await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: "STORY_ASSIGNED",
      })
    );
  });

  it("dispatches webhook on update", async () => {
    setupPatchMocks();

    const req = makeRequest("PATCH", BASE_URL, { title: "Webhook test" });
    await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(dispatchWebhook).toHaveBeenCalledWith(
      PROJECT_ID,
      "story.updated",
      expect.objectContaining({ storyId: "story-1" })
    );
  });

  it("triggers processNextStory on status change", async () => {
    setupPatchMocks(makeStoryData({ status: "TODO" }));
    mockPrisma.story.update.mockResolvedValue({
      ...makeStoryData({ status: "IN_PROGRESS" }),
      labels: [],
      acceptanceCriteria: [],
      assignee: null,
    });

    const req = makeRequest("PATCH", BASE_URL, { status: "IN_PROGRESS" });
    await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(processNextStory).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("returns 404 for non-existent story", async () => {
    mockPrisma.story.findFirst.mockResolvedValue(null);

    const req = makeRequest("PATCH", BASE_URL, { title: "No story" });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: "missing" }));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/projects/[projectId]/stories/[storyId]", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSessionAuth();
  });

  it("deletes story and returns success", async () => {
    mockPrisma.story.deleteMany.mockResolvedValue({ count: 1 });

    const req = makeRequest("DELETE", BASE_URL);
    const res = await DELETE(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(mockPrisma.story.deleteMany).toHaveBeenCalledWith({
      where: { id: STORY_ID, projectId: PROJECT_ID },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();

    const req = makeRequest("DELETE", BASE_URL);
    const res = await DELETE(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(401);
  });
});
