import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it("returns 200 with status ok when DB is healthy", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns 503 when DB is down", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("Connection refused"));

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("down");
  });

  it("returns JSON content-type", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();

    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
