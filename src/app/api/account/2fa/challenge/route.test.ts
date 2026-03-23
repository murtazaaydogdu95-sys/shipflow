import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";
import { makeRequest, parseResponse } from "@/test/helpers";
import { createHash } from "crypto";

// ── Mocks ────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

// Mock otpauth TOTP
const mockValidate = vi.hoisted(() => vi.fn());
vi.mock("otpauth", () => {
  class MockTOTP {
    validate(opts: { token: string; window: number }) {
      return mockValidate(opts);
    }
  }
  return {
    TOTP: MockTOTP,
    Secret: {
      fromBase32: vi.fn().mockReturnValue("mock-secret"),
    },
  };
});

import { POST } from "./route";

// ── Helpers ──────────────────────────────────────────────────
const BASE_URL = "http://localhost:3000/api/account/2fa/challenge";
const USER_ID = "user-1";

function mockSession(userId: string | null = USER_ID) {
  if (userId) {
    mockAuth.mockResolvedValue({ user: { id: userId } });
  } else {
    mockAuth.mockResolvedValue(null);
  }
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    totpEnabled: true,
    totpSecret: "JBSWY3DPEHPK3PXP",
    totpBackupCodes: null,
    ...overrides,
  };
}

describe("POST /api/account/2fa/challenge", () => {
  beforeEach(() => {
    resetAllMocks();
    mockValidate.mockReset();
    mockSession();
  });

  it("returns success for valid TOTP code", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockValidate.mockReturnValue(0); // delta 0 = valid, current period

    const req = makeRequest("POST", BASE_URL, { code: "123456" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
  });

  it("returns error for invalid TOTP code", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockValidate.mockReturnValue(null); // null = invalid

    const req = makeRequest("POST", BASE_URL, { code: "000000" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("Invalid code");
  });

  it("returns success for valid backup code and removes it", async () => {
    const backupCode = "ABCD-EFGH-1234";
    const hashedCode = createHash("sha256").update(backupCode).digest("hex");
    const otherHash = createHash("sha256").update("OTHER-CODE-5678").digest("hex");
    const backupCodes = JSON.stringify([hashedCode, otherHash]);

    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ totpBackupCodes: backupCodes }));
    mockValidate.mockReturnValue(null); // TOTP fails, so backup is tried

    mockPrisma.user.update.mockResolvedValue({});

    const req = makeRequest("POST", BASE_URL, { code: backupCode });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);

    // Verify the used backup code was removed
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: {
        totpBackupCodes: JSON.stringify([otherHash]), // Only the other code remains
      },
    });
  });

  it("returns error for invalid backup code", async () => {
    const hashedCode = createHash("sha256").update("REAL-CODE-1234").digest("hex");
    const backupCodes = JSON.stringify([hashedCode]);

    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ totpBackupCodes: backupCodes }));
    mockValidate.mockReturnValue(null); // TOTP fails

    const req = makeRequest("POST", BASE_URL, { code: "WRONG-CODE-9999" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("Invalid code");
  });

  it("returns 401 for unauthenticated user", async () => {
    mockSession(null);

    const req = makeRequest("POST", BASE_URL, { code: "123456" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await parseResponse(res);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns error when 2FA is not enabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ totpEnabled: false }));

    const req = makeRequest("POST", BASE_URL, { code: "123456" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("2FA is not enabled");
  });

  it("returns error when code is missing", async () => {
    const req = makeRequest("POST", BASE_URL, {});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("Code is required");
  });

  it("returns error when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = makeRequest("POST", BASE_URL, { code: "123456" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toBe("2FA is not enabled");
  });
});
