import { describe, it, expect } from "vitest";
import { createCommentSchema } from "./comment";

describe("comment validations", () => {
  describe("createCommentSchema", () => {
    it("accepts valid comment", () => {
      expect(createCommentSchema.safeParse({ content: "Looks good!" }).success).toBe(true);
    });

    it("accepts content at max length (5000)", () => {
      expect(createCommentSchema.safeParse({ content: "x".repeat(5000) }).success).toBe(true);
    });

    it("rejects empty content", () => {
      expect(createCommentSchema.safeParse({ content: "" }).success).toBe(false);
    });

    it("rejects missing content", () => {
      expect(createCommentSchema.safeParse({}).success).toBe(false);
    });

    it("rejects content over 5000 characters", () => {
      expect(createCommentSchema.safeParse({ content: "x".repeat(5001) }).success).toBe(false);
    });

    it("accepts content with unicode", () => {
      expect(createCommentSchema.safeParse({ content: "Great work! 🎉" }).success).toBe(true);
    });

    it("accepts multiline content", () => {
      expect(
        createCommentSchema.safeParse({ content: "Line 1\nLine 2\nLine 3" }).success
      ).toBe(true);
    });
  });
});
