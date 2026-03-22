import { describe, it, expect } from "vitest";
import { parseCommand } from "./command-parser";

describe("command-parser", () => {
  describe("move commands", () => {
    it("parses 'move CP-001 to done'", () => {
      const result = parseCommand("move CP-001 to done");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-001",
        target: "DONE",
        description: "Move CP-001 to done",
      });
    });

    it("parses 'move CP-042 to backlog'", () => {
      const result = parseCommand("move CP-042 to backlog");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-042",
        target: "BACKLOG",
        description: "Move CP-042 to backlog",
      });
    });

    it("parses 'move CP-100 to todo'", () => {
      const result = parseCommand("move CP-100 to todo");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-100",
        target: "TODO",
        description: "Move CP-100 to todo",
      });
    });

    it("parses 'move CP-005 to in progress' (space variant)", () => {
      const result = parseCommand("move CP-005 to in progress");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-005",
        target: expect.stringMatching(/IN.PROGRESS/),
        description: "Move CP-005 to in progress",
      });
    });

    it("parses 'move CP-005 to in_progress' (underscore variant)", () => {
      const result = parseCommand("move CP-005 to in_progress");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-005",
        target: expect.stringMatching(/IN.PROGRESS/),
        description: "Move CP-005 to in_progress",
      });
    });

    it("parses 'move CP-010 to review'", () => {
      const result = parseCommand("move CP-010 to review");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-010",
        target: "REVIEW",
        description: "Move CP-010 to review",
      });
    });

    it("parses 'move CP-010 to icebox'", () => {
      const result = parseCommand("move CP-010 to icebox");
      expect(result).toEqual({
        type: "move",
        storyRef: "CP-010",
        target: "ICEBOX",
        description: "Move CP-010 to icebox",
      });
    });
  });

  describe("close commands", () => {
    it("parses 'close CP-001'", () => {
      const result = parseCommand("close CP-001");
      expect(result).toEqual({
        type: "close",
        storyRef: "CP-001",
        target: "DONE",
        description: "Close CP-001 (move to Done)",
      });
    });
  });

  describe("delete commands", () => {
    it("parses 'delete CP-015'", () => {
      const result = parseCommand("delete CP-015");
      expect(result).toEqual({
        type: "delete",
        storyRef: "CP-015",
        target: undefined,
        description: "Delete CP-015",
      });
    });
  });

  describe("prioritize commands", () => {
    it("parses 'prioritize CP-002 as high'", () => {
      const result = parseCommand("prioritize CP-002 as high");
      expect(result).toEqual({
        type: "prioritize",
        storyRef: "CP-002",
        target: "HIGH",
        description: "Set CP-002 priority to high",
      });
    });

    it("parses 'prioritize CP-003 critical' (without 'as')", () => {
      const result = parseCommand("prioritize CP-003 critical");
      expect(result).toEqual({
        type: "prioritize",
        storyRef: "CP-003",
        target: "CRITICAL",
        description: "Set CP-003 priority to critical",
      });
    });

    it("parses 'prioritize CP-004 as low'", () => {
      const result = parseCommand("prioritize CP-004 as low");
      expect(result).toEqual({
        type: "prioritize",
        storyRef: "CP-004",
        target: "LOW",
        description: "Set CP-004 priority to low",
      });
    });

    it("parses 'prioritize CP-005 as medium'", () => {
      const result = parseCommand("prioritize CP-005 as medium");
      expect(result).toEqual({
        type: "prioritize",
        storyRef: "CP-005",
        target: "MEDIUM",
        description: "Set CP-005 priority to medium",
      });
    });
  });

  describe("assign-sprint commands", () => {
    it("parses 'assign CP-001 to next sprint'", () => {
      const result = parseCommand("assign CP-001 to next sprint");
      expect(result).toEqual({
        type: "assign-sprint",
        storyRef: "CP-001",
        target: undefined,
        description: "Assign CP-001 to next sprint",
      });
    });
  });

  describe("case insensitivity", () => {
    it("parses uppercase 'MOVE CP-001 TO DONE'", () => {
      const result = parseCommand("MOVE CP-001 TO DONE");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("move");
      expect(result!.storyRef).toBe("CP-001");
    });

    it("parses mixed case 'Move CP-001 To Review'", () => {
      const result = parseCommand("Move CP-001 To Review");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("move");
    });

    it("parses 'CLOSE CP-005'", () => {
      const result = parseCommand("CLOSE CP-005");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("close");
    });
  });

  describe("non-matching input", () => {
    it("returns null for a regular story title", () => {
      expect(parseCommand("Add a login page")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseCommand("")).toBeNull();
    });

    it("returns null for whitespace", () => {
      expect(parseCommand("   ")).toBeNull();
    });

    it("returns null for partial match without story ref", () => {
      expect(parseCommand("move to done")).toBeNull();
    });

    it("returns null for unknown command verb", () => {
      expect(parseCommand("archive CP-001")).toBeNull();
    });
  });
});
