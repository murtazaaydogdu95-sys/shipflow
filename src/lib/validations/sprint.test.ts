import { describe, it, expect } from "vitest";
import { createSprintSchema, updateSprintSchema } from "./sprint";

describe("sprint validations", () => {
  describe("createSprintSchema", () => {
    it("accepts minimal valid input", () => {
      expect(createSprintSchema.safeParse({ name: "Sprint 1" }).success).toBe(true);
    });

    it("accepts full valid input", () => {
      const result = createSprintSchema.safeParse({
        name: "Sprint 1",
        goal: "Ship auth feature",
        startDate: "2025-01-01",
        endDate: "2025-01-14",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      expect(createSprintSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects missing name", () => {
      expect(createSprintSchema.safeParse({}).success).toBe(false);
    });

    it("rejects name over 100 characters", () => {
      expect(createSprintSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
    });

    it("accepts name at 100 characters", () => {
      expect(createSprintSchema.safeParse({ name: "x".repeat(100) }).success).toBe(true);
    });

    it("rejects goal over 500 characters", () => {
      expect(
        createSprintSchema.safeParse({ name: "S", goal: "x".repeat(501) }).success
      ).toBe(false);
    });
  });

  describe("updateSprintSchema", () => {
    it("accepts empty object (all fields optional)", () => {
      expect(updateSprintSchema.safeParse({}).success).toBe(true);
    });

    it("accepts name update", () => {
      expect(updateSprintSchema.safeParse({ name: "Sprint 2" }).success).toBe(true);
    });

    it("validates status enum", () => {
      expect(updateSprintSchema.safeParse({ status: "PLANNING" }).success).toBe(true);
      expect(updateSprintSchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
      expect(updateSprintSchema.safeParse({ status: "COMPLETED" }).success).toBe(true);
      expect(updateSprintSchema.safeParse({ status: "INVALID" }).success).toBe(false);
    });
  });
});
