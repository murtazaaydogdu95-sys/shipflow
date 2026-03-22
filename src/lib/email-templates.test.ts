import { describe, it, expect } from "vitest";
import {
  storyAssignedEmail,
  commentAddedEmail,
  inviteEmail,
  passwordResetEmail,
  dailyDigestEmail,
  agentCompletedEmail,
} from "./email-templates";

describe("email-templates", () => {
  describe("storyAssignedEmail", () => {
    const email = storyAssignedEmail({
      storyTitle: "Build login page",
      projectName: "CodePylot",
      assignerName: "Alice",
      storyUrl: "https://app.test/story/1",
      unsubscribeUrl: "https://app.test/unsubscribe",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes story title in subject", () => {
      expect(email.subject).toContain("Build login page");
    });

    it("includes assigner name in HTML", () => {
      expect(email.html).toContain("Alice");
    });

    it("includes project name in HTML", () => {
      expect(email.html).toContain("CodePylot");
    });

    it("includes story URL link", () => {
      expect(email.html).toContain("https://app.test/story/1");
    });

    it("includes unsubscribe link when provided", () => {
      expect(email.html).toContain("https://app.test/unsubscribe");
      expect(email.html).toContain("Unsubscribe");
    });

    it("omits unsubscribe link when not provided", () => {
      const noUnsub = storyAssignedEmail({
        storyTitle: "Test",
        projectName: "Proj",
        assignerName: "Bob",
        storyUrl: "https://app.test/story/2",
      });
      expect(noUnsub.html).not.toContain("Unsubscribe");
    });
  });

  describe("XSS prevention (esc function)", () => {
    it("escapes HTML special characters in story title", () => {
      const email = storyAssignedEmail({
        storyTitle: '<script>alert("xss")</script>',
        projectName: "Test",
        assignerName: "Eve",
        storyUrl: "https://app.test/story/1",
      });
      expect(email.html).not.toContain("<script>");
      expect(email.html).toContain("&lt;script&gt;");
    });

    it("escapes ampersands", () => {
      const email = commentAddedEmail({
        storyTitle: "A & B",
        commenterName: "User",
        commentPreview: "Looks good & done",
        storyUrl: "https://app.test/story/1",
      });
      expect(email.html).toContain("A &amp; B");
      expect(email.html).toContain("Looks good &amp; done");
    });

    it("escapes quotes in user-controlled content", () => {
      const email = inviteEmail({
        orgName: 'Org "Malicious"',
        inviterName: "User",
        inviteUrl: "https://app.test/invite",
      });
      expect(email.html).toContain("&quot;Malicious&quot;");
      expect(email.html).not.toContain('"Malicious"');
    });

    it("escapes single quotes", () => {
      const email = storyAssignedEmail({
        storyTitle: "It's a test",
        projectName: "O'Reilly",
        assignerName: "Test",
        storyUrl: "https://app.test/story/1",
      });
      expect(email.html).toContain("It&#39;s a test");
      expect(email.html).toContain("O&#39;Reilly");
    });
  });

  describe("commentAddedEmail", () => {
    const email = commentAddedEmail({
      storyTitle: "Fix bug",
      commenterName: "Bob",
      commentPreview: "I think we should refactor this",
      storyUrl: "https://app.test/story/2",
      unsubscribeUrl: "https://app.test/unsub",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes story title in subject", () => {
      expect(email.subject).toContain("Fix bug");
    });

    it("includes commenter name", () => {
      expect(email.html).toContain("Bob");
    });

    it("includes comment preview", () => {
      expect(email.html).toContain("I think we should refactor this");
    });
  });

  describe("inviteEmail", () => {
    const email = inviteEmail({
      orgName: "Acme Corp",
      inviterName: "Charlie",
      inviteUrl: "https://app.test/invite/abc",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes org name in subject", () => {
      expect(email.subject).toContain("Acme Corp");
    });

    it("includes invite URL", () => {
      expect(email.html).toContain("https://app.test/invite/abc");
    });

    it("includes inviter name", () => {
      expect(email.html).toContain("Charlie");
    });

    it("mentions expiry", () => {
      expect(email.html).toContain("7 days");
    });

    it("does not include unsubscribe link", () => {
      expect(email.html).not.toContain("Unsubscribe");
    });
  });

  describe("passwordResetEmail", () => {
    const email = passwordResetEmail({
      resetUrl: "https://app.test/reset?token=abc123",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes reset URL", () => {
      expect(email.html).toContain("https://app.test/reset?token=abc123");
    });

    it("mentions expiry", () => {
      expect(email.html).toContain("1 hour");
    });

    it("has appropriate subject", () => {
      expect(email.subject.toLowerCase()).toContain("password");
    });
  });

  describe("dailyDigestEmail", () => {
    const email = dailyDigestEmail({
      userName: "Dave",
      notifications: [
        { title: "Story moved", message: "SF-001 moved to Done" },
        { title: "Comment added", message: "New comment on SF-002" },
      ],
      dashboardUrl: "https://app.test/dashboard",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes notification count in subject", () => {
      expect(email.subject).toContain("2");
    });

    it("includes user name in greeting", () => {
      expect(email.html).toContain("Dave");
    });

    it("includes all notification items", () => {
      expect(email.html).toContain("Story moved");
      expect(email.html).toContain("SF-001 moved to Done");
      expect(email.html).toContain("Comment added");
      expect(email.html).toContain("New comment on SF-002");
    });

    it("includes dashboard URL", () => {
      expect(email.html).toContain("https://app.test/dashboard");
    });

    it("escapes notification content", () => {
      const xssEmail = dailyDigestEmail({
        userName: "User",
        notifications: [{ title: "<b>Bold</b>", message: "alert('xss')" }],
        dashboardUrl: "https://app.test/dashboard",
      });
      expect(xssEmail.html).not.toContain("<b>Bold</b>");
      expect(xssEmail.html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
    });
  });

  describe("agentCompletedEmail", () => {
    const email = agentCompletedEmail({
      storyTitle: "Add dark mode",
      projectName: "MyApp",
      storyUrl: "https://app.test/story/5",
      unsubscribeUrl: "https://app.test/unsub",
    });

    it("returns subject and html", () => {
      expect(email.subject).toBeTruthy();
      expect(email.html).toBeTruthy();
    });

    it("includes story title in subject", () => {
      expect(email.subject).toContain("Add dark mode");
    });

    it("includes project name", () => {
      expect(email.html).toContain("MyApp");
    });

    it("includes story URL", () => {
      expect(email.html).toContain("https://app.test/story/5");
    });

    it("includes unsubscribe link", () => {
      expect(email.html).toContain("Unsubscribe");
    });
  });

  describe("HTML structure", () => {
    it("all emails produce valid HTML documents", () => {
      const emails = [
        storyAssignedEmail({ storyTitle: "T", projectName: "P", assignerName: "A", storyUrl: "u" }),
        commentAddedEmail({ storyTitle: "T", commenterName: "C", commentPreview: "P", storyUrl: "u" }),
        inviteEmail({ orgName: "O", inviterName: "I", inviteUrl: "u" }),
        passwordResetEmail({ resetUrl: "u" }),
        dailyDigestEmail({ userName: "U", notifications: [], dashboardUrl: "u" }),
        agentCompletedEmail({ storyTitle: "T", projectName: "P", storyUrl: "u" }),
      ];

      for (const email of emails) {
        expect(email.html).toContain("<!DOCTYPE html>");
        expect(email.html).toContain("<html>");
        expect(email.html).toContain("</html>");
        expect(email.html).toContain("<body");
        expect(email.html).toContain("</body>");
      }
    });

    it("all emails include Codepylot branding", () => {
      const email = storyAssignedEmail({
        storyTitle: "T",
        projectName: "P",
        assignerName: "A",
        storyUrl: "u",
      });
      expect(email.html).toContain("Codepylot");
    });
  });
});
