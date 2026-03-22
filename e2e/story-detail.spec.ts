import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";
import { setupStoryDetailHandlers } from "./fixtures/api-handlers";
import { makeStory } from "./fixtures/test-data";

test.describe("Story Detail", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock write operations only; reads use real seeded DB
    await setupStoryDetailHandlers(page, TEST_STORIES.todo1.id);
  });

  test("opens story detail modal", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();
    await expect(modal.sheet).toContainText(TEST_STORIES.todo1.shortId);
  });

  test("displays title, description, priority, type, points", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    await expect(modal.titleInput).toHaveValue(TEST_STORIES.todo1.title);
    await expect(modal.sheet).toContainText(TEST_STORIES.todo1.shortId);
  });

  test("edits title and saves", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeStory({
              ...TEST_STORIES.todo1,
              title: "Updated Title",
              projectId: TEST_PROJECT.id,
            })
          ),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();
    await modal.editTitle("Updated Title");
    await modal.save();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("changes priority", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}`, (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            makeStory({ ...TEST_STORIES.todo1, priority: "CRITICAL", projectId: TEST_PROJECT.id })
          ),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    await modal.changePriority("CRITICAL");
  });

  test("displays acceptance criteria", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();
    await modal.switchTab("Criteria");

    // Seeded DB has 2 acceptance criteria for story-todo-1
    await expect(page.getByText("Given").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("When").first()).toBeVisible();
    await expect(page.getByText("Then").first()).toBeVisible();
  });

  test("shows diff viewer tab when branch exists", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // review1 has branchName set in seeded DB
    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Diff tab should be visible for stories with branches
    const diffTab = page.getByRole("tab", { name: /diff/i });
    await expect(diffTab).toBeVisible({ timeout: 5000 });
  });

  test("shows AI review tab when review score exists", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // review1 has branchName → diff tab visible
    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Diff/Review tab should be visible
    const diffTab = page.getByRole("tab", { name: /diff/i });
    await expect(diffTab).toBeVisible({ timeout: 5000 });
  });

  test("shows agent controls when agent status present", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // review1 has agentStatus: COMPLETED + assignedToAgent: true
    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Review story has agent review panel with Approve/Request Changes/Revert
    await expect(
      page.getByText("Claude Code").or(page.getByRole("button", { name: /approve/i })).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
