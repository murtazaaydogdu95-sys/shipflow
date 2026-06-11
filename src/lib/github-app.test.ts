import { describe, it, expect } from "vitest";
import { parseOwnerRepo, authedCloneUrl, isGithubAppConfigured, getInstallUrl } from "./github-app";

describe("github-app helpers", () => {
  describe("parseOwnerRepo", () => {
    it("parses owner/repo shorthand", () => {
      expect(parseOwnerRepo("acme/widget")).toEqual({ owner: "acme", repo: "widget" });
    });
    it("parses an https URL with .git", () => {
      expect(parseOwnerRepo("https://github.com/acme/widget.git")).toEqual({
        owner: "acme",
        repo: "widget",
      });
    });
    it("parses an ssh URL", () => {
      expect(parseOwnerRepo("git@github.com:acme/widget.git")).toEqual({
        owner: "acme",
        repo: "widget",
      });
    });
    it("returns null for empty/invalid input", () => {
      expect(parseOwnerRepo(null)).toBeNull();
      expect(parseOwnerRepo("not-a-repo")).toBeNull();
    });
  });

  describe("authedCloneUrl", () => {
    it("injects the token into the clone URL", () => {
      expect(authedCloneUrl("ghs_tok", "acme", "widget")).toBe(
        "https://x-access-token:ghs_tok@github.com/acme/widget.git"
      );
    });
  });

  describe("getInstallUrl", () => {
    it("normalizes a bare slug", () => {
      process.env.GITHUB_APP_SLUG = "codepylot-ai-agent";
      expect(getInstallUrl("proj1")).toBe(
        "https://github.com/apps/codepylot-ai-agent/installations/new?state=proj1"
      );
    });
    it("tolerates the full app URL in the slug env var", () => {
      process.env.GITHUB_APP_SLUG = "https://github.com/apps/codepylot-ai-agent";
      expect(getInstallUrl("proj1")).toBe(
        "https://github.com/apps/codepylot-ai-agent/installations/new?state=proj1"
      );
    });
  });

  describe("isGithubAppConfigured", () => {
    it("is false without env", () => {
      const id = process.env.GITHUB_APP_ID;
      const key = process.env.GITHUB_APP_PRIVATE_KEY;
      delete process.env.GITHUB_APP_ID;
      delete process.env.GITHUB_APP_PRIVATE_KEY;
      expect(isGithubAppConfigured()).toBe(false);
      if (id) process.env.GITHUB_APP_ID = id;
      if (key) process.env.GITHUB_APP_PRIVATE_KEY = key;
    });
  });
});
