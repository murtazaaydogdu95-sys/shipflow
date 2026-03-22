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
}));

import { PATCH } from "./route";
import { dispatchWebhook } from "@/lib/webhooks";
import { processNextStory } from "@/lib/agent-trigger";

// ── Helpers ──────────────────────────────────────────────────
const PROJECT_ID = "project-1";
const STORY_ID = "story-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/projects/${PROJECT_ID}/stories/${STORY_ID}/move`;

function mockSessionAuth() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockPrisma.projectMember.findUnique.mockResolvedValue({ role: "OWNER" });
}

describe("PATCH /api/projects/[projectId]/stories/[storyId]/move", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSessionAuth();
    mockPrisma.project.findUnique.mockResolvedValue(makeProjectData());
  });

  it("moves story to new status and position within transaction", async () => {
    const story = makeStoryData({ status: "TODO", position: 0 });
    mockPrisma.story.findFirst.mockResolvedValue(story);
    mockPrisma.story.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.story.update.mockResolvedValue({ ...story, status: "IN_PROGRESS", position: 1 });
    mockPrisma.activity.create.mockResolvedValue({});

    const req = makeRequest("PATCH", BASE_URL, { status: "IN_PROGRESS", position: 1 });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    // Story was updated within transaction
    expect(mockPrisma.story.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "IN_PROGRESS", position: 1 },
      })
    );
  });

  it("reorders other stories in target column", async () => {
    const story = makeStoryData({ status: "TODO", position: 2 });
    mockPrisma.story.findFirst.mockResolvedValue(story);
    mockPrisma.story.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.story.update.mockResolvedValue({ ...story, status: "IN_PROGRESS", position: 0 });
    mockPrisma.activity.create.mockResolvedValue({});

    const req = makeRequest("PATCH", BASE_URL, { status: "IN_PROGRESS", position: 0 });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    // Should have called updateMany for source column (decrement) and target column (increment)
    expect(mockPrisma.story.updateMany).toHaveBeenCalledTimes(2);
  });

  it("validates status transition (422 on invalid)", async () => {
    const story = makeStoryData({ status: "BACKLOG", position: 0 });
    mockPrisma.story.findFirst.mockResolvedValue(story);

    const req = makeRequest("PATCH", BASE_URL, { status: "DONE", position: 0 });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(422);
    const body = await parseResponse(res);
    expect(body.error).toContain("Invalid status transition");
    expect(body.validTransitions).toBeDefined();
  });

  it("dispatches webhook after move", async () => {
    const story = makeStoryData({ status: "TODO", position: 0 });
    mockPrisma.story.findFirst.mockResolvedValue(story);
    mockPrisma.story.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.story.update.mockResolvedValue({ ...story, status: "IN_PROGRESS", position: 0 });
    mockPrisma.activity.create.mockResolvedValue({});

    const req = makeRequest("PATCH", BASE_URL, { status: "IN_PROGRESS", position: 0 });
    await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(dispatchWebhook).toHaveBeenCalledWith(
      PROJECT_ID,
      "story.moved",
      expect.objectContaining({
        storyId: "story-1",
        oldStatus: "TODO",
        newStatus: "IN_PROGRESS",
      })
    );
  });

  it("triggers processNextStory when status changes", async () => {
    const story = makeStoryData({ status: "BACKLOG", position: 0 });
    mockPrisma.story.findFirst.mockResolvedValue(story);
    mockPrisma.story.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.story.update.mockResolvedValue({ ...story, status: "TODO", position: 0 });
    mockPrisma.activity.create.mockResolvedValue({});

    const req = makeRequest("PATCH", BASE_URL, { status: "TODO", position: 0 });
    await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(processNextStory).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("returns 404 when story not found", async () => {
    mockPrisma.story.findFirst.mockResolvedValue(null);

    const req = makeRequest("PATCH", BASE_URL, { status: "TODO", position: 0 });
    const res = await PATCH(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(404);
  });
});
