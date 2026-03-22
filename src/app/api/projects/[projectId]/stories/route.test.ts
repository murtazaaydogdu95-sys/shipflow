import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks, makeStoryData, makeProjectData } from "@/test/mocks/prisma";
import { makeRequest, makeParams, parseResponse } from "@/test/helpers";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

vi.mock("@/lib/webhooks", () => ({ dispatchWebhook: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/agent-trigger", () => ({ processNextStory: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { check: vi.fn().mockResolvedValue({ allowed: true, remaining: 59, resetAt: Date.now() + 60000 }) },
  authRateLimit: { check: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 }) },
}));

import { GET, POST } from "./route";
import { dispatchWebhook } from "@/lib/webhooks";
import { processNextStory } from "@/lib/agent-trigger";

// ── Helpers ──────────────────────────────────────────────────
const PROJECT_ID = "project-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/projects/${PROJECT_ID}/stories`;

function mockSessionAuth() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockPrisma.projectMember.findUnique.mockResolvedValue({ role: "OWNER" });
}

function mockApiKeyAuth() {
  mockAuth.mockResolvedValue(null);
  mockPrisma.project.findFirst.mockResolvedValue(makeProjectData({ id: PROJECT_ID, apiKeyHash: "abc123" }));
}

function mockUnauthenticated() {
  mockAuth.mockResolvedValue(null);
  mockPrisma.project.findFirst.mockResolvedValue(null);
  mockPrisma.project.findUnique.mockResolvedValue(null);
}

describe("GET /api/projects/[projectId]/stories", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("returns stories for authenticated session user", async () => {
    mockSessionAuth();
    const stories = [makeStoryData(), makeStoryData({ id: "story-2", shortId: "CP-002" })];
    mockPrisma.story.findMany.mockResolvedValue(stories);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body).toHaveLength(2);
  });

  it("returns stories for API key auth", async () => {
    mockApiKeyAuth();
    mockPrisma.story.findMany.mockResolvedValue([makeStoryData()]);

    const req = makeRequest("GET", BASE_URL, undefined, { authorization: "Bearer test-key" });
    const res = await GET(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body).toHaveLength(1);
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthenticated();

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(401);
  });

  it("filters by status query param", async () => {
    mockSessionAuth();
    mockPrisma.story.findMany.mockResolvedValue([]);

    const req = makeRequest("GET", `${BASE_URL}?status=TODO`);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "TODO" }),
      })
    );
  });

  it("filters by sprintId query param", async () => {
    mockSessionAuth();
    mockPrisma.story.findMany.mockResolvedValue([]);

    const req = makeRequest("GET", `${BASE_URL}?sprintId=sprint-1`);
    const res = await GET(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    expect(mockPrisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sprintId: "sprint-1" }),
      })
    );
  });
});

describe("POST /api/projects/[projectId]/stories", () => {
  beforeEach(() => {
    resetAllMocks();
    // Default: session auth with no plan limit
    mockSessionAuth();
  });

  function setupCreateMocks(shortIdMax = 5) {
    mockPrisma.$queryRaw.mockResolvedValue([{ max_num: shortIdMax }]);
    mockPrisma.story.findFirst.mockResolvedValue(null); // no last story in column
    mockPrisma.project.findUnique.mockResolvedValue(makeProjectData());
    mockPrisma.activity.create.mockResolvedValue({});
    // checkStoryLimit internals
    mockPrisma.organization.findUnique.mockResolvedValue({ plan: "PRO" });
    mockPrisma.story.count.mockResolvedValue(0);
  }

  it("creates story with valid input", async () => {
    setupCreateMocks();
    const created = makeStoryData({ shortId: "CP-006" });
    mockPrisma.story.create.mockResolvedValue(created);

    const req = makeRequest("POST", BASE_URL, { title: "New feature" });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.shortId).toBe("CP-006");
    expect(mockPrisma.story.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "New feature", projectId: PROJECT_ID }),
      })
    );
  });

  it("generates sequential shortId based on max existing", async () => {
    setupCreateMocks(42);
    mockPrisma.story.create.mockResolvedValue(makeStoryData({ shortId: "CP-043" }));

    const req = makeRequest("POST", BASE_URL, { title: "Test" });
    await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(mockPrisma.story.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shortId: "CP-043" }),
      })
    );
  });

  it("dispatches webhook on creation", async () => {
    setupCreateMocks();
    mockPrisma.story.create.mockResolvedValue(makeStoryData());

    const req = makeRequest("POST", BASE_URL, { title: "Webhook test" });
    await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(dispatchWebhook).toHaveBeenCalledWith(
      PROJECT_ID,
      "story.created",
      expect.objectContaining({ storyId: "story-1" })
    );
  });

  it("triggers processNextStory on creation", async () => {
    setupCreateMocks();
    mockPrisma.story.create.mockResolvedValue(makeStoryData());

    const req = makeRequest("POST", BASE_URL, { title: "Agent test" });
    await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(processNextStory).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("throws ZodError for invalid body (missing/empty title)", async () => {
    setupCreateMocks();

    const req = makeRequest("POST", BASE_URL, { title: "" }); // title min 1

    // Route uses Zod .parse() which throws ZodError on invalid input
    await expect(POST(req, makeParams({ projectId: PROJECT_ID }))).rejects.toThrow();
  });

  it("returns 413 for oversized body", async () => {
    setupCreateMocks();

    const largeBody = "x".repeat(600_000);
    const req = makeRequest("POST", BASE_URL, { title: largeBody });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(413);
  });

  it("returns 403 when plan story limit exceeded", async () => {
    mockSessionAuth();
    mockPrisma.$queryRaw.mockResolvedValue([{ max_num: 1 }]);
    mockPrisma.story.findFirst.mockResolvedValue(null);
    // checkStoryLimit: project has orgId, org is FREE plan, count at limit
    mockPrisma.project.findUnique.mockResolvedValue(makeProjectData({ orgId: "org-1" }));
    mockPrisma.organization.findUnique.mockResolvedValue({ plan: "FREE" });
    mockPrisma.story.count.mockResolvedValue(15); // FREE limit is 15

    const req = makeRequest("POST", BASE_URL, { title: "Over limit" });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(403);
    const body = await parseResponse(res);
    expect(body.error).toContain("Upgrade to Pro");
  });
});
