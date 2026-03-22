import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature, resolvePlanFromPriceId, PLAN_LIMITS } from "./paddle";

describe("paddle", () => {
  describe("PLAN_LIMITS", () => {
    it("has FREE, PRO, and PRO_MAX plans", () => {
      expect(PLAN_LIMITS).toHaveProperty("FREE");
      expect(PLAN_LIMITS).toHaveProperty("PRO");
      expect(PLAN_LIMITS).toHaveProperty("PRO_MAX");
    });

    it("FREE plan has restrictive limits", () => {
      expect(PLAN_LIMITS.FREE.maxProjects).toBe(3);
      expect(PLAN_LIMITS.FREE.maxStoriesPerProject).toBe(15);
      expect(PLAN_LIMITS.FREE.maxConcurrentAgents).toBe(1);
      expect(PLAN_LIMITS.FREE.priorityQueue).toBe(false);
    });

    it("PRO plan has higher limits", () => {
      expect(PLAN_LIMITS.PRO.maxProjects).toBe(Infinity);
      expect(PLAN_LIMITS.PRO.maxStoriesPerProject).toBe(Infinity);
      expect(PLAN_LIMITS.PRO.maxConcurrentAgents).toBe(3);
    });

    it("PRO_MAX plan has highest limits", () => {
      expect(PLAN_LIMITS.PRO_MAX.maxProjects).toBe(Infinity);
      expect(PLAN_LIMITS.PRO_MAX.maxStoriesPerProject).toBe(Infinity);
      expect(PLAN_LIMITS.PRO_MAX.maxAIRewritesPerMonth).toBe(Infinity);
      expect(PLAN_LIMITS.PRO_MAX.maxConcurrentAgents).toBe(5);
      expect(PLAN_LIMITS.PRO_MAX.priorityQueue).toBe(true);
    });

    it("FREE AI rewrites < PRO AI rewrites", () => {
      expect(PLAN_LIMITS.FREE.maxAIRewritesPerMonth).toBeLessThan(
        PLAN_LIMITS.PRO.maxAIRewritesPerMonth
      );
    });
  });

  describe("verifyWebhookSignature", () => {
    const TEST_SECRET = "test-webhook-secret-123";

    beforeEach(() => {
      process.env.PADDLE_WEBHOOK_SECRET = TEST_SECRET;
    });

    afterEach(() => {
      delete process.env.PADDLE_WEBHOOK_SECRET;
    });

    function createSignature(body: string, ts: string, secret: string): string {
      const payload = `${ts}:${body}`;
      const hmac = createHmac("sha256", secret).update(payload).digest("hex");
      return `ts=${ts};h1=${hmac}`;
    }

    it("returns true for valid signature", () => {
      const body = '{"event":"subscription.created"}';
      const ts = "1234567890";
      const sig = createSignature(body, ts, TEST_SECRET);

      expect(verifyWebhookSignature(body, sig)).toBe(true);
    });

    it("returns false for invalid signature", () => {
      const body = '{"event":"subscription.created"}';
      const sig = "ts=1234567890;h1=invalidsignature";

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false for tampered body", () => {
      const originalBody = '{"event":"subscription.created"}';
      const ts = "1234567890";
      const sig = createSignature(originalBody, ts, TEST_SECRET);

      const tamperedBody = '{"event":"subscription.cancelled"}';
      expect(verifyWebhookSignature(tamperedBody, sig)).toBe(false);
    });

    it("returns false for wrong secret", () => {
      const body = '{"event":"test"}';
      const ts = "1234567890";
      const sig = createSignature(body, ts, "wrong-secret");

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false when PADDLE_WEBHOOK_SECRET is not set", () => {
      delete process.env.PADDLE_WEBHOOK_SECRET;

      const body = '{"event":"test"}';
      const sig = "ts=123;h1=abc";

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false for missing ts in signature", () => {
      expect(verifyWebhookSignature("body", "h1=somehash")).toBe(false);
    });

    it("returns false for missing h1 in signature", () => {
      expect(verifyWebhookSignature("body", "ts=123456")).toBe(false);
    });

    it("returns false for empty signature string", () => {
      expect(verifyWebhookSignature("body", "")).toBe(false);
    });

    it("handles signature with extra fields", () => {
      const body = '{"event":"test"}';
      const ts = "1234567890";
      const sig = createSignature(body, ts, TEST_SECRET);
      // Add extra field
      const extendedSig = sig + ";extra=value";

      expect(verifyWebhookSignature(body, extendedSig)).toBe(true);
    });
  });

  describe("resolvePlanFromPriceId", () => {
    afterEach(() => {
      delete process.env.PADDLE_PRO_MAX_PRICE_ID;
    });

    it("returns PRO for any price ID when PRO_MAX price is not configured", () => {
      delete process.env.PADDLE_PRO_MAX_PRICE_ID;
      expect(resolvePlanFromPriceId("pri_12345")).toBe("PRO");
    });

    it("returns PRO_MAX when price ID matches PRO_MAX price", () => {
      process.env.PADDLE_PRO_MAX_PRICE_ID = "pri_promax_123";
      expect(resolvePlanFromPriceId("pri_promax_123")).toBe("PRO_MAX");
    });

    it("returns PRO when price ID does not match PRO_MAX price", () => {
      process.env.PADDLE_PRO_MAX_PRICE_ID = "pri_promax_123";
      expect(resolvePlanFromPriceId("pri_other_456")).toBe("PRO");
    });

    it("returns PRO for empty string price ID", () => {
      process.env.PADDLE_PRO_MAX_PRICE_ID = "pri_promax_123";
      expect(resolvePlanFromPriceId("")).toBe("PRO");
    });
  });
});
