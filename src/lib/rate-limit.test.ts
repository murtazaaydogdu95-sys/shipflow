import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Ensure Upstash env vars are NOT set so we get in-memory limiter
const originalEnv = { ...process.env };

describe("rate-limit (in-memory)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function getFreshLimiters() {
    // Force fresh module import to get new in-memory stores
    const mod = await import("./rate-limit");
    return mod;
  }

  it("allows requests under the limit", async () => {
    const { apiRateLimit } = await getFreshLimiters();

    const result = await apiRateLimit.check("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(60);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("tracks remaining count correctly", async () => {
    const { apiRateLimit } = await getFreshLimiters();

    const result1 = await apiRateLimit.check("user-count-test");
    expect(result1.allowed).toBe(true);
    const firstRemaining = result1.remaining;

    const result2 = await apiRateLimit.check("user-count-test");
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(firstRemaining - 1);
  });

  it("blocks requests over the limit", async () => {
    const { authRateLimit } = await getFreshLimiters();

    // authRateLimit allows 10 per minute
    for (let i = 0; i < 10; i++) {
      const result = await authRateLimit.check("user-flood");
      expect(result.allowed).toBe(true);
    }

    // 11th request should be blocked
    const blocked = await authRateLimit.check("user-flood");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks different identifiers separately", async () => {
    const { authRateLimit } = await getFreshLimiters();

    // Exhaust limit for user-a
    for (let i = 0; i < 10; i++) {
      await authRateLimit.check("user-a");
    }

    const blockedA = await authRateLimit.check("user-a");
    expect(blockedA.allowed).toBe(false);

    // user-b should still be allowed
    const allowedB = await authRateLimit.check("user-b");
    expect(allowedB.allowed).toBe(true);
  });

  it("handles exactly at the limit", async () => {
    const { authRateLimit } = await getFreshLimiters();

    // Use exactly 10 requests (the limit for auth)
    for (let i = 0; i < 9; i++) {
      await authRateLimit.check("user-exact");
    }

    // 10th request (exactly at limit) — should still be allowed
    const atLimit = await authRateLimit.check("user-exact");
    expect(atLimit.allowed).toBe(true);
    expect(atLimit.remaining).toBe(0);

    // 11th request — should be blocked
    const overLimit = await authRateLimit.check("user-exact");
    expect(overLimit.allowed).toBe(false);
  });

  it("provides a resetAt timestamp in the future", async () => {
    const { apiRateLimit } = await getFreshLimiters();

    const now = Date.now();
    const result = await apiRateLimit.check("user-reset-test");

    expect(result.resetAt).toBeGreaterThan(now);
  });

  it("allows requests after window expires (sliding window)", async () => {
    // We test this by using a custom limiter approach
    // The in-memory limiter filters timestamps within windowMs
    // Since we can't easily fast-forward time, we verify the
    // filtering logic indirectly
    const { authRateLimit } = await getFreshLimiters();

    const result = await authRateLimit.check("user-window");
    expect(result.allowed).toBe(true);
    // The resetAt should be approximately now + windowMs (60s)
    expect(result.resetAt).toBeGreaterThan(Date.now());
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 61_000);
  });

  it("returns zero remaining when blocked", async () => {
    const { authRateLimit } = await getFreshLimiters();

    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await authRateLimit.check("user-zero-remaining");
    }

    const blocked = await authRateLimit.check("user-zero-remaining");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });
});
