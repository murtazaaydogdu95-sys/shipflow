import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature, resolvePlanFromVariantId, PLAN_LIMITS } from "./lemonsqueezy";

describe("lemonsqueezy", () => {
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
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = TEST_SECRET;
    });

    afterEach(() => {
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    });

    function createSignature(body: string, secret: string): string {
      return createHmac("sha256", secret).update(body).digest("hex");
    }

    it("returns true for valid signature", () => {
      const body = '{"meta":{"event_name":"subscription_created"}}';
      const sig = createSignature(body, TEST_SECRET);

      expect(verifyWebhookSignature(body, sig)).toBe(true);
    });

    it("returns false for invalid signature", () => {
      const body = '{"meta":{"event_name":"subscription_created"}}';
      const sig = "invalidsignature";

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false for tampered body", () => {
      const originalBody = '{"meta":{"event_name":"subscription_created"}}';
      const sig = createSignature(originalBody, TEST_SECRET);

      const tamperedBody = '{"meta":{"event_name":"subscription_cancelled"}}';
      expect(verifyWebhookSignature(tamperedBody, sig)).toBe(false);
    });

    it("returns false for wrong secret", () => {
      const body = '{"meta":{"event_name":"test"}}';
      const sig = createSignature(body, "wrong-secret");

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false when LEMONSQUEEZY_WEBHOOK_SECRET is not set", () => {
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

      const body = '{"meta":{"event_name":"test"}}';
      const sig = "abc123";

      expect(verifyWebhookSignature(body, sig)).toBe(false);
    });

    it("returns false for empty signature string", () => {
      expect(verifyWebhookSignature("body", "")).toBe(false);
    });
  });

  describe("resolvePlanFromVariantId", () => {
    afterEach(() => {
      delete process.env.LS_VARIANT_ID_PRO_MAX;
    });

    it("returns PRO for any variant ID when PRO_MAX variant is not configured", () => {
      delete process.env.LS_VARIANT_ID_PRO_MAX;
      expect(resolvePlanFromVariantId("12345")).toBe("PRO");
    });

    it("returns PRO_MAX when variant ID matches PRO_MAX variant", () => {
      process.env.LS_VARIANT_ID_PRO_MAX = "variant_promax_123";
      expect(resolvePlanFromVariantId("variant_promax_123")).toBe("PRO_MAX");
    });

    it("returns PRO when variant ID does not match PRO_MAX variant", () => {
      process.env.LS_VARIANT_ID_PRO_MAX = "variant_promax_123";
      expect(resolvePlanFromVariantId("variant_other_456")).toBe("PRO");
    });

    it("returns PRO for empty string variant ID", () => {
      process.env.LS_VARIANT_ID_PRO_MAX = "variant_promax_123";
      expect(resolvePlanFromVariantId("")).toBe("PRO");
    });
  });
});
