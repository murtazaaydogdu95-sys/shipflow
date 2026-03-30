import { describe, it, expect } from "vitest";
import { createAgentSchema, updateAgentSchema, AGENT_ROLES, ADAPTER_TYPES, AGENT_STATUSES } from "./agent";

describe("agent validations", () => {
  describe("createAgentSchema", () => {
    it("accepts minimal valid input (name + role)", () => {
      const result = createAgentSchema.safeParse({
        name: "Frontend Coder",
        role: "coder",
      });
      expect(result.success).toBe(true);
    });

    it("accepts full valid input with all optional fields", () => {
      const result = createAgentSchema.safeParse({
        name: "Backend Reviewer",
        role: "reviewer",
        title: "Senior Code Reviewer",
        icon: "bot",
        capabilities: "TypeScript, Node.js, REST APIs",
        adapterType: "openai",
        adapterConfig: {
          model: "gpt-4o",
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: "You are a code reviewer.",
        },
        reportsTo: "clrk1234567890abcdefghijk",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = createAgentSchema.safeParse({
        role: "coder",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createAgentSchema.safeParse({
        name: "",
        role: "coder",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name over 100 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "x".repeat(101),
        role: "coder",
      });
      expect(result.success).toBe(false);
    });

    it("accepts name at 100 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "x".repeat(100),
        role: "coder",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing role", () => {
      const result = createAgentSchema.safeParse({
        name: "Test Agent",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role", () => {
      const result = createAgentSchema.safeParse({
        name: "Test Agent",
        role: "hacker",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid roles", () => {
      for (const role of AGENT_ROLES) {
        const result = createAgentSchema.safeParse({
          name: `${role} agent`,
          role,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid adapter type", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        adapterType: "gemini",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid adapter types", () => {
      for (const adapter of ADAPTER_TYPES) {
        const result = createAgentSchema.safeParse({
          name: `${adapter} agent`,
          role: "coder",
          adapterType: adapter,
        });
        expect(result.success).toBe(true);
      }
    });

    it("defaults adapterType to claude when not specified", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.adapterType).toBe("claude");
      }
    });

    it("rejects adapterConfig with temperature out of range", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        adapterConfig: { temperature: 3 },
      });
      expect(result.success).toBe(false);
    });

    it("rejects adapterConfig with negative temperature", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        adapterConfig: { temperature: -1 },
      });
      expect(result.success).toBe(false);
    });

    it("rejects adapterConfig with non-positive maxTokens", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        adapterConfig: { maxTokens: 0 },
      });
      expect(result.success).toBe(false);
    });

    it("rejects systemPrompt over 5000 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        adapterConfig: { systemPrompt: "x".repeat(5001) },
      });
      expect(result.success).toBe(false);
    });

    it("rejects title over 200 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        title: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects capabilities over 1000 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "Test",
        role: "coder",
        capabilities: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateAgentSchema", () => {
    it("accepts empty update (all fields optional)", () => {
      const result = updateAgentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial update (name only)", () => {
      const result = updateAgentSchema.safeParse({
        name: "Renamed Agent",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status update to paused", () => {
      const result = updateAgentSchema.safeParse({
        status: "paused",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status update to terminated", () => {
      const result = updateAgentSchema.safeParse({
        status: "terminated",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status update to idle", () => {
      const result = updateAgentSchema.safeParse({
        status: "idle",
      });
      expect(result.success).toBe(true);
    });

    it("rejects status update to running (not allowed via PATCH)", () => {
      const result = updateAgentSchema.safeParse({
        status: "running",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status value", () => {
      const result = updateAgentSchema.safeParse({
        status: "active",
      });
      expect(result.success).toBe(false);
    });

    it("accepts pauseReason with status", () => {
      const result = updateAgentSchema.safeParse({
        status: "paused",
        pauseReason: "Maintenance",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null pauseReason (for clearing)", () => {
      const result = updateAgentSchema.safeParse({
        pauseReason: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects pauseReason over 200 characters", () => {
      const result = updateAgentSchema.safeParse({
        pauseReason: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("constants", () => {
    it("AGENT_ROLES has expected values", () => {
      expect(AGENT_ROLES).toEqual(["coder", "tester", "reviewer", "architect", "qa", "devops", "designer", "pentester"]);
    });

    it("ADAPTER_TYPES has expected values", () => {
      expect(ADAPTER_TYPES).toEqual(["claude", "openai", "ollama"]);
    });

    it("AGENT_STATUSES has expected values", () => {
      expect(AGENT_STATUSES).toEqual(["idle", "running", "paused", "terminated", "pending_approval"]);
    });
  });
});
