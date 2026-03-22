import { describe, it, expect } from "vitest";
import { createProjectSchema, updateProjectSchema } from "./project";

describe("project validations", () => {
  describe("createProjectSchema", () => {
    it("accepts minimal valid input", () => {
      expect(createProjectSchema.safeParse({ name: "My Project" }).success).toBe(true);
    });

    it("accepts full valid input", () => {
      const result = createProjectSchema.safeParse({
        name: "Project",
        description: "A project description",
        techStack: "Next.js, React",
        githubRepo: "https://github.com/user/repo",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      expect(createProjectSchema.safeParse({ name: "" }).success).toBe(false);
    });

    it("rejects missing name", () => {
      expect(createProjectSchema.safeParse({}).success).toBe(false);
    });

    it("rejects name over 100 characters", () => {
      expect(createProjectSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
    });

    it("rejects description over 500 characters", () => {
      expect(
        createProjectSchema.safeParse({ name: "P", description: "x".repeat(501) }).success
      ).toBe(false);
    });

    it("rejects techStack over 200 characters", () => {
      expect(
        createProjectSchema.safeParse({ name: "P", techStack: "x".repeat(201) }).success
      ).toBe(false);
    });

    it("rejects invalid githubRepo URL", () => {
      expect(
        createProjectSchema.safeParse({ name: "P", githubRepo: "not-a-url" }).success
      ).toBe(false);
    });

    it("accepts empty string for githubRepo", () => {
      expect(
        createProjectSchema.safeParse({ name: "P", githubRepo: "" }).success
      ).toBe(true);
    });
  });

  describe("updateProjectSchema", () => {
    it("accepts empty object (all fields optional)", () => {
      expect(updateProjectSchema.safeParse({}).success).toBe(true);
    });

    it("accepts isPublic boolean", () => {
      expect(updateProjectSchema.safeParse({ isPublic: true }).success).toBe(true);
    });

    it("accepts agentAutoAssign boolean", () => {
      expect(updateProjectSchema.safeParse({ agentAutoAssign: true }).success).toBe(true);
    });

    it("validates aiProvider enum", () => {
      expect(updateProjectSchema.safeParse({ aiProvider: "anthropic" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ aiProvider: "openai" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ aiProvider: "ollama" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ aiProvider: "invalid" }).success).toBe(false);
    });

    it("validates maxConcurrentAgents range (1-3)", () => {
      expect(updateProjectSchema.safeParse({ maxConcurrentAgents: 0 }).success).toBe(false);
      expect(updateProjectSchema.safeParse({ maxConcurrentAgents: 1 }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ maxConcurrentAgents: 3 }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ maxConcurrentAgents: 4 }).success).toBe(false);
    });

    it("validates deployProvider enum", () => {
      expect(updateProjectSchema.safeParse({ deployProvider: "vercel" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ deployProvider: "railway" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ deployProvider: "fly" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ deployProvider: "custom" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ deployProvider: "heroku" }).success).toBe(false);
    });

    it("allows nullable deployProvider", () => {
      expect(updateProjectSchema.safeParse({ deployProvider: null }).success).toBe(true);
    });

    it("validates agentMinPriority enum", () => {
      expect(updateProjectSchema.safeParse({ agentMinPriority: "HIGH" }).success).toBe(true);
      expect(updateProjectSchema.safeParse({ agentMinPriority: "INVALID" }).success).toBe(false);
    });
  });
});
