import { describe, it, expect } from "vitest";
import { calculateCostCents, formatCostCents } from "./cost-tracking";

describe("cost-tracking", () => {
  describe("calculateCostCents", () => {
    it("returns correct cost for claude-sonnet-4-20250514", () => {
      // Pricing: input=300, output=1500 cents per 1M tokens
      // 1000 input tokens = 1000 * 300 / 1_000_000 = 0.3 cents
      // 500 output tokens = 500 * 1500 / 1_000_000 = 0.75 cents
      // Total = 1.05 -> ceil = 2 cents
      const cost = calculateCostCents("claude-sonnet-4-20250514", 1000, 500);
      expect(cost).toBe(2);
    });

    it("returns correct cost for claude-haiku-4-5-20251001", () => {
      // Pricing: input=80, output=400 cents per 1M tokens
      // 10000 input = 10000 * 80 / 1_000_000 = 0.8 cents
      // 5000 output = 5000 * 400 / 1_000_000 = 2.0 cents
      // Total = 2.8 -> ceil = 3 cents
      const cost = calculateCostCents("claude-haiku-4-5-20251001", 10000, 5000);
      expect(cost).toBe(3);
    });

    it("returns correct cost for claude-opus-4-20250514", () => {
      // Pricing: input=1500, output=7500 cents per 1M tokens
      // 100000 input = 100000 * 1500 / 1_000_000 = 150 cents
      // 50000 output = 50000 * 7500 / 1_000_000 = 375 cents
      // Total = 525 cents
      const cost = calculateCostCents("claude-opus-4-20250514", 100000, 50000);
      expect(cost).toBe(525);
    });

    it("returns correct cost for gpt-4o", () => {
      // Pricing: input=250, output=1000 cents per 1M tokens
      // 1_000_000 input = 250 cents
      // 1_000_000 output = 1000 cents
      // Total = 1250 cents
      const cost = calculateCostCents("gpt-4o", 1_000_000, 1_000_000);
      expect(cost).toBe(1250);
    });

    it("returns correct cost for gpt-4o-mini", () => {
      // Pricing: input=15, output=60 cents per 1M tokens
      // 1_000_000 input = 15 cents
      // 1_000_000 output = 60 cents
      // Total = 75 cents
      const cost = calculateCostCents("gpt-4o-mini", 1_000_000, 1_000_000);
      expect(cost).toBe(75);
    });

    it("falls back to default pricing for unknown model", () => {
      // Default: input=300, output=1500 (same as sonnet)
      // 1000 input = 0.3 cents, 500 output = 0.75 cents
      // Total = 1.05 -> ceil = 2 cents
      const cost = calculateCostCents("unknown-model-v42", 1000, 500);
      expect(cost).toBe(2);
    });

    it("returns zero for zero tokens", () => {
      const cost = calculateCostCents("claude-sonnet-4-20250514", 0, 0);
      expect(cost).toBe(0);
    });

    it("returns zero for zero input and zero output on any model", () => {
      const cost = calculateCostCents("gpt-4o", 0, 0);
      expect(cost).toBe(0);
    });

    it("handles input-only (zero output tokens)", () => {
      // 1_000_000 input tokens at sonnet rate: 300 cents
      const cost = calculateCostCents("claude-sonnet-4-20250514", 1_000_000, 0);
      expect(cost).toBe(300);
    });

    it("handles output-only (zero input tokens)", () => {
      // 1_000_000 output tokens at sonnet rate: 1500 cents
      const cost = calculateCostCents("claude-sonnet-4-20250514", 0, 1_000_000);
      expect(cost).toBe(1500);
    });

    it("rounds up fractional cents (ceiling)", () => {
      // 1 input token on sonnet: 1 * 300 / 1_000_000 = 0.0003 -> ceil = 1
      const cost = calculateCostCents("claude-sonnet-4-20250514", 1, 0);
      expect(cost).toBe(1);
    });

    it("handles large token counts without overflow", () => {
      // 100M input tokens at opus: 100_000_000 * 1500 / 1_000_000 = 150_000 cents = $1,500
      const cost = calculateCostCents("claude-opus-4-20250514", 100_000_000, 0);
      expect(cost).toBe(150_000);
    });
  });

  describe("formatCostCents", () => {
    it("formats small amounts in cents", () => {
      expect(formatCostCents(5)).toBe("5c");
      expect(formatCostCents(99)).toBe("99c");
    });

    it("formats amounts >= 100 as dollars", () => {
      expect(formatCostCents(100)).toBe("$1.00");
      expect(formatCostCents(1250)).toBe("$12.50");
      expect(formatCostCents(150_000)).toBe("$1500.00");
    });

    it("formats zero cents", () => {
      expect(formatCostCents(0)).toBe("0c");
    });
  });
});
