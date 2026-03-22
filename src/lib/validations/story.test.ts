import { describe, it, expect } from "vitest";
import { createStorySchema, updateStorySchema, moveStorySchema, rewriteStorySchema } from "./story";

describe("story validations", () => {
  describe("createStorySchema", () => {
    it("accepts minimal valid input (title only)", () => {
      const result = createStorySchema.safeParse({ title: "My story" });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input", () => {
      const result = createStorySchema.safeParse({
        title: "Login page",
        description: "Build a login page",
        rawInput: "add login",
        userStory: "As a user...",
        status: "TODO",
        priority: "HIGH",
        type: "feature",
        storyPoints: 5,
        sprintId: "sprint-1",
        assigneeId: "user-1",
        parentId: "story-parent",
        labelIds: ["label-1"],
        acceptanceCriteria: [
          { given: "user is on login page", when: "they enter creds", then: "they are logged in" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createStorySchema.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing title", () => {
      const result = createStorySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects title over 200 characters", () => {
      const result = createStorySchema.safeParse({ title: "x".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("accepts title at 200 characters", () => {
      const result = createStorySchema.safeParse({ title: "x".repeat(200) });
      expect(result.success).toBe(true);
    });

    it("validates status enum", () => {
      expect(createStorySchema.safeParse({ title: "t", status: "INVALID" }).success).toBe(false);
      expect(createStorySchema.safeParse({ title: "t", status: "TODO" }).success).toBe(true);
      expect(createStorySchema.safeParse({ title: "t", status: "ICEBOX" }).success).toBe(true);
    });

    it("validates priority enum", () => {
      expect(createStorySchema.safeParse({ title: "t", priority: "URGENT" }).success).toBe(false);
      expect(createStorySchema.safeParse({ title: "t", priority: "CRITICAL" }).success).toBe(true);
    });

    it("validates type enum", () => {
      expect(createStorySchema.safeParse({ title: "t", type: "epic" }).success).toBe(false);
      expect(createStorySchema.safeParse({ title: "t", type: "bug" }).success).toBe(true);
    });

    it("validates storyPoints range (0-100)", () => {
      expect(createStorySchema.safeParse({ title: "t", storyPoints: -1 }).success).toBe(false);
      expect(createStorySchema.safeParse({ title: "t", storyPoints: 101 }).success).toBe(false);
      expect(createStorySchema.safeParse({ title: "t", storyPoints: 0 }).success).toBe(true);
      expect(createStorySchema.safeParse({ title: "t", storyPoints: 100 }).success).toBe(true);
    });

    it("rejects non-integer storyPoints", () => {
      expect(createStorySchema.safeParse({ title: "t", storyPoints: 3.5 }).success).toBe(false);
    });

    it("allows nullable storyPoints", () => {
      expect(createStorySchema.safeParse({ title: "t", storyPoints: null }).success).toBe(true);
    });

    it("validates acceptance criteria structure", () => {
      const result = createStorySchema.safeParse({
        title: "t",
        acceptanceCriteria: [{ given: "g" }], // missing when, then
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateStorySchema", () => {
    it("accepts empty object (all fields optional)", () => {
      const result = updateStorySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts agentStatus field", () => {
      const result = updateStorySchema.safeParse({ agentStatus: "RUNNING" });
      expect(result.success).toBe(true);
    });

    it("validates agentStatus enum", () => {
      expect(updateStorySchema.safeParse({ agentStatus: "INVALID" }).success).toBe(false);
    });

    it("validates branchName regex", () => {
      expect(updateStorySchema.safeParse({ branchName: "feat/SF-001-login" }).success).toBe(true);
      expect(updateStorySchema.safeParse({ branchName: "feat/my.branch-name_v2" }).success).toBe(true);
      expect(updateStorySchema.safeParse({ branchName: "invalid branch!!" }).success).toBe(false);
      expect(updateStorySchema.safeParse({ branchName: "has spaces" }).success).toBe(false);
      expect(updateStorySchema.safeParse({ branchName: "semi;colon" }).success).toBe(false);
    });

    it("allows nullable branchName", () => {
      expect(updateStorySchema.safeParse({ branchName: null }).success).toBe(true);
    });
  });

  describe("moveStorySchema", () => {
    it("accepts valid move", () => {
      const result = moveStorySchema.safeParse({ status: "IN_PROGRESS", position: 0 });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      expect(moveStorySchema.safeParse({ status: "INVALID", position: 0 }).success).toBe(false);
    });

    it("rejects negative position", () => {
      expect(moveStorySchema.safeParse({ status: "TODO", position: -1 }).success).toBe(false);
    });

    it("rejects missing status", () => {
      expect(moveStorySchema.safeParse({ position: 0 }).success).toBe(false);
    });

    it("rejects missing position", () => {
      expect(moveStorySchema.safeParse({ status: "TODO" }).success).toBe(false);
    });
  });

  describe("rewriteStorySchema", () => {
    it("accepts valid input", () => {
      const result = rewriteStorySchema.safeParse({ rawInput: "add login page" });
      expect(result.success).toBe(true);
    });

    it("accepts input with techStack", () => {
      const result = rewriteStorySchema.safeParse({
        rawInput: "add login",
        techStack: "Next.js, React",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty rawInput", () => {
      expect(rewriteStorySchema.safeParse({ rawInput: "" }).success).toBe(false);
    });

    it("rejects rawInput over 5000 chars", () => {
      expect(rewriteStorySchema.safeParse({ rawInput: "x".repeat(5001) }).success).toBe(false);
    });

    it("accepts rawInput at 5000 chars", () => {
      expect(rewriteStorySchema.safeParse({ rawInput: "x".repeat(5000) }).success).toBe(true);
    });
  });
});
