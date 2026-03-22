import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks, makeStoryData, makeProjectData } from "@/test/mocks/prisma";
import { makeRequest, makeParams, parseResponse } from "@/test/helpers";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

import { GET, POST } from "./route";

// ── Helpers ──────────────────────────────────────────────────
const PROJECT_ID = "project-1";
const STORY_ID = "story-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/projects/${PROJECT_ID}/stories/${STORY_ID}/comments`;

function mockSessionAuth() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockPrisma.projectMember.findUnique.mockResolvedValue({ role: "OWNER" });
}

function mockApiKeyAuth() {
  mockAuth.mockResolvedValue(null);
  mockPrisma.project.findFirst.mockResolvedValue(makeProjectData({ id: PROJECT_ID, apiKeyHash: "abc123" }));
}

describe("GET /api/projects/[projectId]/stories/[storyId]/comments", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("returns comments ordered by createdAt", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });
    const comments = [
      { id: "c1", content: "First", createdAt: new Date("2025-01-01"), user: { id: USER_ID, name: "User", image: null } },
      { id: "c2", content: "Second", createdAt: new Date("2025-01-02"), user: { id: "u2", name: "User 2", image: null } },
    ];
    mockPrisma.comment.findMany.mockResolvedValue(comments);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body).toHaveLength(2);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "asc" },
      })
    );
  });

  it("returns empty array when no comments", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });
    mockPrisma.comment.findMany.mockResolvedValue([]);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body).toEqual([]);
  });

  it("returns 404 when story not found", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue(null);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID, storyId: "missing" }));

    expect(res.status).toBe(404);
  });
});

describe("POST /api/projects/[projectId]/stories/[storyId]/comments", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("creates comment with session user", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });
    const comment = {
      id: "c1",
      content: "Great work!",
      userId: USER_ID,
      storyId: STORY_ID,
      user: { id: USER_ID, name: "Test User", image: null },
    };
    mockPrisma.comment.create.mockResolvedValue(comment);
    mockPrisma.story.findUnique.mockResolvedValue(makeStoryData({ assigneeId: null }));

    const req = makeRequest("POST", BASE_URL, { content: "Great work!" });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.content).toBe("Great work!");
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Great work!",
          userId: USER_ID,
          storyId: STORY_ID,
        }),
      })
    );
  });

  it("returns 403 when using API key auth (session-only route)", async () => {
    mockApiKeyAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });

    const req = makeRequest("POST", BASE_URL, { content: "Not allowed" }, { authorization: "Bearer test-key" });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(403);
    const body = await parseResponse(res);
    expect(body.error).toContain("Session auth required");
  });

  it("throws ZodError for empty content", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });

    const req = makeRequest("POST", BASE_URL, { content: "" });

    // Route uses Zod .parse() which throws ZodError on invalid input
    await expect(POST(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }))).rejects.toThrow();
  });

  it("returns 413 for oversized body", async () => {
    mockSessionAuth();
    mockPrisma.story.findFirst.mockResolvedValue({ id: STORY_ID });

    const largeContent = "x".repeat(70_000);
    const req = makeRequest("POST", BASE_URL, { content: largeContent });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID, storyId: STORY_ID }));

    expect(res.status).toBe(413);
  });
});
