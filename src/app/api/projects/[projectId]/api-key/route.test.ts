import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks, makeProjectData } from "@/test/mocks/prisma";
import { makeRequest, makeParams, parseResponse } from "@/test/helpers";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { POST, DELETE } from "./route";

// ── Helpers ──────────────────────────────────────────────────
const PROJECT_ID = "project-1";
const USER_ID = "user-1";
const BASE_URL = `http://localhost:3000/api/projects/${PROJECT_ID}/api-key`;

function mockSessionAuth() {
  mockAuth.mockResolvedValue({ user: { id: USER_ID } });
  mockPrisma.projectMember.findUnique.mockResolvedValue({ role: "OWNER" });
}

describe("POST /api/projects/[projectId]/api-key", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSessionAuth();
  });

  it("generates a new API key", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: null, apiKey: null, orgId: "org-1" })
    );
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.key).toBeDefined();
    expect(body.key).toMatch(/^sk_live_/);
    expect(body.prefix).toBeDefined();
    expect(body.prefix).toMatch(/^sk_live_/);
    expect(body.prefix).toContain("...");
  });

  it("stores hashed key, not plaintext, in DB", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: null, apiKey: null, orgId: "org-1" })
    );
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));
    const body = await parseResponse(res);

    // Verify the DB update does NOT contain the raw key
    const updateCall = mockPrisma.project.update.mock.calls[0][0];
    expect(updateCall.data.apiKeyHash).toBeDefined();
    expect(updateCall.data.apiKeyHash).not.toBe(body.key);
    // apiKey should be cleared (null)
    expect(updateCall.data.apiKey).toBeNull();
  });

  it("returns 401 for unauthenticated request", async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.projectMember.findUnique.mockResolvedValue(null);

    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(401);
  });

  it("returns 400 when key already exists without rotate flag", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: "existing-hash", apiKey: null, orgId: "org-1" })
    );

    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toContain("already exists");
  });

  it("allows rotation when rotate flag is true", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: "existing-hash", apiKey: null, orgId: "org-1" })
    );
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, { rotate: true });
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.key).toMatch(/^sk_live_/);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(404);
  });

  it("creates audit log entry on key generation", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: null, apiKey: null, orgId: "org-1" })
    );
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, {});
    await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "API_KEY_CREATED",
          userId: USER_ID,
          orgId: "org-1",
        }),
      })
    );
  });

  it("creates API_KEY_ROTATED audit log on rotation", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(
      makeProjectData({ apiKeyHash: "existing-hash", apiKey: null, orgId: "org-1" })
    );
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, { rotate: true });
    await POST(req, makeParams({ projectId: PROJECT_ID }));

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "API_KEY_ROTATED",
        }),
      })
    );
  });
});

describe("DELETE /api/projects/[projectId]/api-key", () => {
  beforeEach(() => {
    resetAllMocks();
    mockSessionAuth();
  });

  it("revokes the API key", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(makeProjectData({ orgId: "org-1" }));
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = makeRequest("DELETE", BASE_URL);
    const res = await DELETE(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);

    expect(mockPrisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          apiKeyHash: null,
          apiKeyPrefix: null,
          apiKeyLastRotated: null,
          apiKey: null,
        },
      })
    );
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const req = makeRequest("DELETE", BASE_URL);
    const res = await DELETE(req, makeParams({ projectId: PROJECT_ID }));

    expect(res.status).toBe(404);
  });
});
