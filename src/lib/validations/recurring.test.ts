import { describe, it, expect } from "vitest";
import { createRecurringStorySchema, updateRecurringStorySchema } from "./recurring";

describe("recurring validations", () => {
  describe("createRecurringStorySchema", () => {
    it("accepts minimal valid input", () => {
      const result = createRecurringStorySchema.safeParse({
        title: "Daily standup",
        frequency: "daily",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input", () => {
      const result = createRecurringStorySchema.safeParse({
        title: "Weekly review",
        description: "Review sprint progress",
        type: "chore",
        priority: "MEDIUM",
        storyPoints: 2,
        frequency: "weekly",
        dayOfWeek: 1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      expect(
        createRecurringStorySchema.safeParse({ title: "", frequency: "daily" }).success
      ).toBe(false);
    });

    it("rejects missing title", () => {
      expect(createRecurringStorySchema.safeParse({ frequency: "daily" }).success).toBe(false);
    });

    it("rejects missing frequency", () => {
      expect(createRecurringStorySchema.safeParse({ title: "Task" }).success).toBe(false);
    });

    it("rejects title over 200 characters", () => {
      expect(
        createRecurringStorySchema.safeParse({
          title: "x".repeat(201),
          frequency: "daily",
        }).success
      ).toBe(false);
    });

    it("rejects description over 2000 characters", () => {
      expect(
        createRecurringStorySchema.safeParse({
          title: "Task",
          frequency: "daily",
          description: "x".repeat(2001),
        }).success
      ).toBe(false);
    });

    it("validates frequency enum", () => {
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "daily" }).success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "weekly" }).success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "monthly" }).success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "hourly" }).success
      ).toBe(false);
    });

    it("validates dayOfWeek range (0-6)", () => {
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "weekly", dayOfWeek: 0 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "weekly", dayOfWeek: 6 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "weekly", dayOfWeek: 7 })
          .success
      ).toBe(false);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "weekly", dayOfWeek: -1 })
          .success
      ).toBe(false);
    });

    it("validates dayOfMonth range (1-31)", () => {
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "monthly", dayOfMonth: 1 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "monthly", dayOfMonth: 31 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "monthly", dayOfMonth: 0 })
          .success
      ).toBe(false);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "monthly", dayOfMonth: 32 })
          .success
      ).toBe(false);
    });

    it("validates storyPoints range (0-100)", () => {
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "daily", storyPoints: 0 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "daily", storyPoints: 100 })
          .success
      ).toBe(true);
      expect(
        createRecurringStorySchema.safeParse({ title: "T", frequency: "daily", storyPoints: 101 })
          .success
      ).toBe(false);
    });
  });

  describe("updateRecurringStorySchema", () => {
    it("accepts empty object (all fields optional)", () => {
      expect(updateRecurringStorySchema.safeParse({}).success).toBe(true);
    });

    it("accepts active field", () => {
      expect(updateRecurringStorySchema.safeParse({ active: false }).success).toBe(true);
      expect(updateRecurringStorySchema.safeParse({ active: true }).success).toBe(true);
    });

    it("accepts partial updates", () => {
      expect(updateRecurringStorySchema.safeParse({ title: "Updated" }).success).toBe(true);
      expect(updateRecurringStorySchema.safeParse({ frequency: "monthly" }).success).toBe(true);
      expect(updateRecurringStorySchema.safeParse({ priority: "HIGH" }).success).toBe(true);
    });

    it("still validates field constraints", () => {
      expect(
        updateRecurringStorySchema.safeParse({ title: "" }).success
      ).toBe(false);
      expect(
        updateRecurringStorySchema.safeParse({ frequency: "hourly" }).success
      ).toBe(false);
    });
  });
});
