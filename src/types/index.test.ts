import { describe, it, expect } from "vitest";
import {
  STORY_STATUSES,
  ALL_STORY_STATUSES,
  PRIORITIES,
  STORY_TYPES,
  SPRINT_STATUSES,
  COLUMN_TITLES,
  FEED_STATUS_ORDER,
  FEED_SECTION_TITLES,
} from "./index";

describe("type constants", () => {
  describe("STORY_STATUSES", () => {
    it("contains the 5 board-visible statuses in order", () => {
      expect(STORY_STATUSES).toEqual(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
    });

    it("does not include ICEBOX", () => {
      expect(STORY_STATUSES).not.toContain("ICEBOX");
    });
  });

  describe("ALL_STORY_STATUSES", () => {
    it("contains all 6 statuses including ICEBOX", () => {
      expect(ALL_STORY_STATUSES).toEqual(["ICEBOX", "BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
    });

    it("starts with ICEBOX", () => {
      expect(ALL_STORY_STATUSES[0]).toBe("ICEBOX");
    });

    it("is a superset of STORY_STATUSES", () => {
      for (const status of STORY_STATUSES) {
        expect(ALL_STORY_STATUSES).toContain(status);
      }
    });
  });

  describe("PRIORITIES", () => {
    it("contains all 4 priorities in severity order", () => {
      expect(PRIORITIES).toEqual(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
    });
  });

  describe("STORY_TYPES", () => {
    it("contains all 6 story types", () => {
      expect(STORY_TYPES).toEqual(["feature", "bug", "chore", "refactor", "docs", "test"]);
    });
  });

  describe("SPRINT_STATUSES", () => {
    it("contains the 3 sprint lifecycle statuses in order", () => {
      expect(SPRINT_STATUSES).toEqual(["PLANNING", "ACTIVE", "COMPLETED"]);
    });
  });

  describe("COLUMN_TITLES", () => {
    it("has a human-readable title for every status", () => {
      for (const status of ALL_STORY_STATUSES) {
        expect(COLUMN_TITLES[status]).toBeTruthy();
        expect(typeof COLUMN_TITLES[status]).toBe("string");
      }
    });

    it("maps specific statuses to expected titles", () => {
      expect(COLUMN_TITLES.ICEBOX).toBe("Someday");
      expect(COLUMN_TITLES.BACKLOG).toBe("Backlog");
      expect(COLUMN_TITLES.TODO).toBe("To Do");
      expect(COLUMN_TITLES.IN_PROGRESS).toBe("In Progress");
      expect(COLUMN_TITLES.REVIEW).toBe("Review");
      expect(COLUMN_TITLES.DONE).toBe("Done");
    });
  });

  describe("FEED_STATUS_ORDER", () => {
    it("contains all 6 statuses", () => {
      expect(FEED_STATUS_ORDER).toHaveLength(6);
      for (const status of ALL_STORY_STATUSES) {
        expect(FEED_STATUS_ORDER).toContain(status);
      }
    });

    it("puts REVIEW first (needs attention)", () => {
      expect(FEED_STATUS_ORDER[0]).toBe("REVIEW");
    });

    it("puts DONE last", () => {
      expect(FEED_STATUS_ORDER[FEED_STATUS_ORDER.length - 1]).toBe("DONE");
    });
  });

  describe("FEED_SECTION_TITLES", () => {
    it("has a title for every status", () => {
      for (const status of ALL_STORY_STATUSES) {
        expect(FEED_SECTION_TITLES[status]).toBeTruthy();
      }
    });

    it("maps REVIEW to 'Needs Review'", () => {
      expect(FEED_SECTION_TITLES.REVIEW).toBe("Needs Review");
    });

    it("maps IN_PROGRESS to 'In Progress'", () => {
      expect(FEED_SECTION_TITLES.IN_PROGRESS).toBe("In Progress");
    });
  });
});
