import { describe, it, expect } from "vitest";
import { STORY_TEMPLATES, type StoryTemplate } from "./story-templates";

const VALID_TYPES = ["feature", "bug", "chore", "refactor", "docs", "test"];
const VALID_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

describe("story-templates", () => {
  it("exports a non-empty array of templates", () => {
    expect(Array.isArray(STORY_TEMPLATES)).toBe(true);
    expect(STORY_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has exactly 8 templates", () => {
    expect(STORY_TEMPLATES).toHaveLength(8);
  });

  it("all templates have unique ids", () => {
    const ids = STORY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all templates have unique names", () => {
    const names = STORY_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  describe.each(STORY_TEMPLATES)("template: $name", (template: StoryTemplate) => {
    it("has required string fields", () => {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.title).toBeTruthy();
      expect(template.userStory).toBeTruthy();
    });

    it("has a valid type", () => {
      expect(VALID_TYPES).toContain(template.type);
    });

    it("has a valid priority", () => {
      expect(VALID_PRIORITIES).toContain(template.priority);
    });

    it("has story points between 1 and 13", () => {
      expect(template.storyPoints).toBeGreaterThanOrEqual(1);
      expect(template.storyPoints).toBeLessThanOrEqual(13);
    });

    it("has at least one acceptance criterion", () => {
      expect(template.acceptanceCriteria.length).toBeGreaterThanOrEqual(1);
    });

    it("each acceptance criterion has given/when/then", () => {
      for (const ac of template.acceptanceCriteria) {
        expect(ac.given).toBeTruthy();
        expect(ac.when).toBeTruthy();
        expect(ac.then).toBeTruthy();
      }
    });

    it("userStory starts with 'As a'", () => {
      expect(template.userStory).toMatch(/^As a/);
    });
  });
});
