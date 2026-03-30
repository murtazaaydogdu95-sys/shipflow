import { describe, it, expect } from "vitest";
import { createWorkspaceSchema, updateWorkspaceSchema } from "./workspace";

describe("workspace validations", () => {
  describe("createWorkspaceSchema", () => {
    it("accepts valid input with required workingDir", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/home/agent/project",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input with all optional fields except metadata", () => {
      const result = createWorkspaceSchema.safeParse({
        agentId: "agent-123",
        workingDir: "/home/agent/project",
        branchName: "feat/SF-001-new-feature",
        cloneUrl: "https://github.com/org/repo.git",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing workingDir", () => {
      const result = createWorkspaceSchema.safeParse({
        agentId: "agent-123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty workingDir", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects workingDir over 500 characters", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("accepts workingDir at 500 characters", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "a".repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it("accepts null agentId", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        agentId: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid branchName characters", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        branchName: "feat/invalid branch name!",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid branchName with slashes, dots, and hyphens", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        branchName: "feat/SF-001_my-feature.v2",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null branchName", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        branchName: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid cloneUrl", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        cloneUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("accepts null cloneUrl", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        cloneUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts null metadata", () => {
      const result = createWorkspaceSchema.safeParse({
        workingDir: "/tmp/workspace",
        metadata: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateWorkspaceSchema", () => {
    it("accepts empty update (all fields optional)", () => {
      const result = updateWorkspaceSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial update with status only", () => {
      const result = updateWorkspaceSchema.safeParse({
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status update to closed", () => {
      const result = updateWorkspaceSchema.safeParse({
        status: "closed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status value", () => {
      const result = updateWorkspaceSchema.safeParse({
        status: "archived",
      });
      expect(result.success).toBe(false);
    });

    it("accepts branchName update", () => {
      const result = updateWorkspaceSchema.safeParse({
        branchName: "fix/SF-002-hotfix",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null branchName for clearing", () => {
      const result = updateWorkspaceSchema.safeParse({
        branchName: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid branchName characters", () => {
      const result = updateWorkspaceSchema.safeParse({
        branchName: "feat/bad branch!",
      });
      expect(result.success).toBe(false);
    });

    it("accepts closedAt as ISO datetime string", () => {
      const result = updateWorkspaceSchema.safeParse({
        closedAt: "2026-03-30T12:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects closedAt with invalid datetime format", () => {
      const result = updateWorkspaceSchema.safeParse({
        closedAt: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("accepts null closedAt for clearing", () => {
      const result = updateWorkspaceSchema.safeParse({
        closedAt: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts null metadata for clearing", () => {
      const result = updateWorkspaceSchema.safeParse({
        metadata: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts combined partial update without metadata", () => {
      const result = updateWorkspaceSchema.safeParse({
        status: "closed",
        closedAt: "2026-03-30T12:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });
  });
});
