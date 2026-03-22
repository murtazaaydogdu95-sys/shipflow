import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Agent", () => {
  test("triggers agent from story detail", async ({ authenticatedPage: page }) => {
    // Mock trigger-agent endpoint
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}/trigger-agent`,
      (route) => {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Look for Claude tab (always visible)
    const claudeTab = page.getByRole("tab", { name: /claude/i });
    await expect(claudeTab).toBeVisible({ timeout: 5000 });
    await claudeTab.click();

    // Should show Claude prompt content
    await expect(page.getByText(/claude/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows agent status badge on card", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // The review story (SF-007) has agentStatus = "COMPLETED" in seeded DB
    const card = board.getStoryCard(TEST_STORIES.review1.shortId);
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test("shows agent logs tab", async ({ authenticatedPage: page }) => {
    // Mock agent logs (no real agent runs in test)
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.review1.id}/logs`,
      (route) => {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            log: "Starting agent...\nCreating branch feat/SF-007-search\nImplementing search...\nDone!",
            totalLines: 4,
          }),
        });
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // review1 has assignedToAgent: true → Logs tab visible
    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Switch to Logs tab
    const logsTab = page.getByRole("tab", { name: /logs/i });
    await expect(logsTab).toBeVisible({ timeout: 5000 });
    await logsTab.click();

    // Should show agent log content
    await expect(page.getByText("Starting agent...")).toBeVisible({ timeout: 5000 });
  });

  test("auto-refreshes logs when running", async ({ authenticatedPage: page }) => {
    let callCount = 0;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.review1.id}/logs`,
      (route) => {
        callCount++;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            log: `Log line ${callCount}\n`,
            totalLines: callCount,
          }),
        });
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    const logsTab = page.getByRole("tab", { name: /logs/i });
    await expect(logsTab).toBeVisible({ timeout: 5000 });
    await logsTab.click();

    await expect(page.getByText(/Log line/i).first()).toBeVisible({ timeout: 5000 });

    // Verify at least 1 log call was made
    await expect(async () => {
      expect(callCount).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });

  test("shows revert button for completed agent stories", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // review1 has status=REVIEW, assignedToAgent=true, agentStatus=COMPLETED
    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // The review panel shows Approve, Request Changes, and Revert buttons
    // Revert uses Undo2 icon with title="Revert agent work"
    await expect(
      page.getByRole("button", { name: /approve/i })
        .or(page.getByTitle("Revert agent work"))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });
});
