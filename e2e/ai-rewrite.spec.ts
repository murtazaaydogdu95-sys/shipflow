import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { QuickCapturePage } from "./helpers/page-objects/quick-capture.page";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";
import { makeStory } from "./fixtures/test-data";

test.describe("AI Rewrite", () => {
  test("triggers AI rewrite and shows structured form", async ({ authenticatedPage: page }) => {
    // Mock rewrite API (no real AI available in test)
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Implement Payment Webhook Handler",
          userStory: "As a developer, I want to handle failed payment webhooks so that the system can retry charges.",
          acceptanceCriteria: [
            { given: "a failed payment event", when: "the webhook endpoint receives it", then: "the system should log the failure" },
          ],
          storyPoints: 5,
          priority: "HIGH",
          type: "feature",
        }),
      });
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("add webhook for failed payments");
    await quickCapture.clickRewrite();

    // After rewrite, the structured form appears with a title <Input> inside the dialog
    const dialog = page.getByRole("dialog");
    const titleInput = dialog.locator("input").first();
    await expect(titleInput).toHaveValue("Implement Payment Webhook Handler", { timeout: 10000 });
  });

  test("displays rewritten title, user story, and acceptance criteria", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Add User Profile API",
          userStory: "As a user, I want to update my profile information.",
          acceptanceCriteria: [
            { given: "an authenticated user", when: "they submit profile changes", then: "the profile should be updated" },
          ],
          storyPoints: 3,
          priority: "MEDIUM",
          type: "feature",
        }),
      });
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("user profile api");
    await quickCapture.clickRewrite();

    const dialog = page.getByRole("dialog");
    const titleInput = dialog.locator("input").first();
    await expect(titleInput).toHaveValue("Add User Profile API", { timeout: 10000 });
    await expect(dialog.getByText("As a user")).toBeVisible();
    await expect(dialog.getByText("Given")).toBeVisible();
  });

  test("allows editing rewritten fields before creating", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Original Title",
          userStory: "Original story",
          acceptanceCriteria: [],
          storyPoints: 3,
          priority: "MEDIUM",
          type: "feature",
        }),
      });
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("some idea");
    await quickCapture.clickRewrite();

    const dialog = page.getByRole("dialog");
    const titleInput = dialog.locator("input").first();
    await expect(titleInput).toHaveValue("Original Title", { timeout: 10000 });

    await titleInput.clear();
    await titleInput.fill("Modified Title");
    await expect(titleInput).toHaveValue("Modified Title");
  });

  test("shows error when rewrite fails", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite`, (route) => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "AI service unavailable" }),
      });
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("some idea");
    await quickCapture.clickRewrite();

    await expect(page.getByText(/fail|error|unavailable/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows usage limit warning at limit", async ({ authenticatedPage: page }) => {
    // Mock usage at limit for the rewrite-usage endpoint
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite-usage`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ used: 5, limit: 5, remaining: 0 }),
      });
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("some idea");

    // Should show limit warning or usage indicator
    await expect(
      page.getByText(/limit|upgrade|0.*remaining|5\/5|no rewrites left/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("creates story with rewritten data", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/rewrite`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Rewritten Story Title",
          userStory: "As a user, I want...",
          acceptanceCriteria: [
            { given: "condition", when: "action", then: "result" },
          ],
          storyPoints: 5,
          priority: "HIGH",
          type: "feature",
        }),
      });
    });

    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(
            makeStory({
              shortId: "SF-102",
              title: "Rewritten Story Title",
              userStory: "As a user, I want...",
              status: "BACKLOG",
            })
          ),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();
    await quickCapture.typeIdea("some idea");
    await quickCapture.clickRewrite();

    const dialog = page.getByRole("dialog");
    const titleInput = dialog.locator("input").first();
    await expect(titleInput).toHaveValue("Rewritten Story Title", { timeout: 10000 });

    await quickCapture.clickCreate();

    // Dialog should close
    await expect(quickCapture.dialog).not.toBeVisible({ timeout: 5000 });
  });
});
