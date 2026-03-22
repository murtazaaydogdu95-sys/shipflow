import { describe, it, expect } from "vitest";
import { isValidTransition, getValidTransitions } from "./story-state-machine";

describe("story-state-machine", () => {
  describe("isValidTransition — valid transitions", () => {
    const validCases: [string, string][] = [
      // ICEBOX →
      ["ICEBOX", "BACKLOG"],
      ["ICEBOX", "TODO"],
      // BACKLOG →
      ["BACKLOG", "ICEBOX"],
      ["BACKLOG", "TODO"],
      // TODO →
      ["TODO", "BACKLOG"],
      ["TODO", "ICEBOX"],
      ["TODO", "IN_PROGRESS"],
      // IN_PROGRESS →
      ["IN_PROGRESS", "TODO"],
      ["IN_PROGRESS", "REVIEW"],
      ["IN_PROGRESS", "DONE"],
      // REVIEW →
      ["REVIEW", "IN_PROGRESS"],
      ["REVIEW", "TODO"],
      ["REVIEW", "DONE"],
      // DONE →
      ["DONE", "REVIEW"],
      ["DONE", "TODO"],
    ];

    it.each(validCases)("%s → %s is valid", (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });
  });

  describe("isValidTransition — invalid transitions", () => {
    const invalidCases: [string, string][] = [
      // ICEBOX cannot go to
      ["ICEBOX", "IN_PROGRESS"],
      ["ICEBOX", "REVIEW"],
      ["ICEBOX", "DONE"],
      // BACKLOG cannot go to
      ["BACKLOG", "IN_PROGRESS"],
      ["BACKLOG", "REVIEW"],
      ["BACKLOG", "DONE"],
      // TODO cannot go to
      ["TODO", "REVIEW"],
      ["TODO", "DONE"],
      // IN_PROGRESS cannot go to
      ["IN_PROGRESS", "BACKLOG"],
      ["IN_PROGRESS", "ICEBOX"],
      // REVIEW cannot go to
      ["REVIEW", "BACKLOG"],
      ["REVIEW", "ICEBOX"],
      // DONE cannot go to
      ["DONE", "BACKLOG"],
      ["DONE", "ICEBOX"],
      ["DONE", "IN_PROGRESS"],
    ];

    it.each(invalidCases)("%s → %s is invalid", (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  });

  describe("isValidTransition — edge cases", () => {
    it("returns false for same-status transition", () => {
      expect(isValidTransition("TODO", "TODO")).toBe(false);
    });

    it("returns false for unknown source status", () => {
      expect(isValidTransition("UNKNOWN", "TODO")).toBe(false);
    });

    it("returns false for unknown target status", () => {
      expect(isValidTransition("TODO", "UNKNOWN")).toBe(false);
    });

    it("returns false for empty strings", () => {
      expect(isValidTransition("", "")).toBe(false);
    });
  });

  describe("getValidTransitions", () => {
    it("returns correct transitions for ICEBOX", () => {
      expect(getValidTransitions("ICEBOX")).toEqual(["BACKLOG", "TODO"]);
    });

    it("returns correct transitions for BACKLOG", () => {
      expect(getValidTransitions("BACKLOG")).toEqual(["ICEBOX", "TODO"]);
    });

    it("returns correct transitions for TODO", () => {
      expect(getValidTransitions("TODO")).toEqual(["BACKLOG", "ICEBOX", "IN_PROGRESS"]);
    });

    it("returns correct transitions for IN_PROGRESS", () => {
      expect(getValidTransitions("IN_PROGRESS")).toEqual(["TODO", "REVIEW", "DONE"]);
    });

    it("returns correct transitions for REVIEW", () => {
      expect(getValidTransitions("REVIEW")).toEqual(["IN_PROGRESS", "TODO", "DONE"]);
    });

    it("returns correct transitions for DONE", () => {
      expect(getValidTransitions("DONE")).toEqual(["REVIEW", "TODO"]);
    });

    it("returns empty array for unknown status", () => {
      expect(getValidTransitions("UNKNOWN")).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getValidTransitions("")).toEqual([]);
    });
  });
});
