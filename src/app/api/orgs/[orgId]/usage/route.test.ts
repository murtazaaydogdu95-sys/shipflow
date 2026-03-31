import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";
import { makeRequest, makeParams, parseResponse } from "@/test/helpers";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock paddle module — only PLAN_LIMITS is used
vi.mock("@/lib/lemonsqueezy", () => ({
  PLAN_LIMITS: {
    FREE: {
      maxProjects: 3,
      maxStoriesPerProject: 15,
      maxAIRewritesPerMonth: 4,
    },
    PRO: {
      maxProjects: Infinity,
      maxStoriesPerProject: Infinity,
      maxAIRewritesPerMonth: 50,
    },
  },
  lemonSqueezyEnabled: false,
}));

import { GET } from "./route";

// ── Helpers ──────────────────────────────────────────────────
const ORG_ID = "org-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/orgs/${ORG_ID}/usage`;

describe("GET /api/orgs/[orgId]/usage", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("returns usage stats for org member", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPrisma.orgMember.findUnique.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID, role: "OWNER" });
    mockPrisma.organization.findUnique.mockResolvedValue({ plan: "FREE" });
    mockPrisma.project.count.mockResolvedValue(2);
    mockPrisma.project.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    mockPrisma.story.count.mockResolvedValue(10);
    mockPrisma.orgMember.count.mockResolvedValue(1);
    mockPrisma.activity.count.mockResolvedValue(3);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ orgId: ORG_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.plan).toBe("FREE");
    expect(body.projects.used).toBe(2);
    expect(body.projects.limit).toBe(3);
    expect(body.stories.used).toBe(10);
    expect(body.aiRewrites.used).toBe(3);
    expect(body.aiRewrites.limit).toBe(4);
    expect(body.members.count).toBe(1);
  });

  it("returns plan limits alongside usage", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPrisma.orgMember.findUnique.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID, role: "MEMBER" });
    mockPrisma.organization.findUnique.mockResolvedValue({ plan: "PRO" });
    mockPrisma.project.count.mockResolvedValue(10);
    mockPrisma.project.findMany.mockResolvedValue([{ id: "p1" }]);
    mockPrisma.story.count.mockResolvedValue(100);
    mockPrisma.orgMember.count.mockResolvedValue(5);
    mockPrisma.activity.count.mockResolvedValue(20);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ orgId: ORG_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.plan).toBe("PRO");
    expect(body.projects.limit).toBeNull(); // Infinity → null
    expect(body.stories.limit).toBeNull();
    expect(body.aiRewrites.limit).toBe(50);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ orgId: ORG_ID }));

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a member of the org", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPrisma.orgMember.findUnique.mockResolvedValue(null);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ orgId: ORG_ID }));

    expect(res.status).toBe(403);
  });

  it("counts only current month AI rewrites", async () => {
    mockAuth.mockResolvedValue({ user: { id: USER_ID } });
    mockPrisma.orgMember.findUnique.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID, role: "OWNER" });
    mockPrisma.organization.findUnique.mockResolvedValue({ plan: "FREE" });
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.project.findMany.mockResolvedValue([{ id: "p1" }]);
    mockPrisma.story.count.mockResolvedValue(5);
    mockPrisma.orgMember.count.mockResolvedValue(1);
    mockPrisma.activity.count.mockResolvedValue(2);

    const req = makeRequest("GET", BASE_URL);
    const res = await GET(req, makeParams({ orgId: ORG_ID }));

    expect(res.status).toBe(200);
    // Verify activity.count was called with a date filter for this month
    expect(mockPrisma.activity.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "STORY_REWRITTEN",
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });
});
