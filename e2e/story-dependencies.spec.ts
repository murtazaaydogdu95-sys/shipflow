import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES, makeStory } from "./fixtures/test-data";

test.describe("Story Dependencies @medium", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock dependency write operations
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/*/dependencies`,
      (route) => {
        if (route.request().method() === "POST") {
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: `dep-${Date.now()}`,
              blockerId: TEST_STORIES.todo1.id,
              blockedId: TEST_STORIES.todo2.id,
              createdAt: new Date().toISOString(),
            }),
          });
        }
        if (route.request().method() === "DELETE") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
        return route.continue();
      }
    );

    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/*/dependencies/*`,
      (route) => {
        if (route.request().method() === "DELETE") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
        return route.continue();
      }
    );
  });

  test("story detail shows dependencies tab", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo2.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Deps tab should be visible
    const depsTab = page.getByRole("tab", { name: /deps/i });
    await expect(depsTab).toBeVisible({ timeout: 5000 });
  });

  test("can add a dependency (blocked by another story)", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo2.id}/dependencies`,
      (route) => {
        if (route.request().method() === "POST") {
          postCalled = true;
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: `dep-${Date.now()}`,
              blockerId: TEST_STORIES.todo1.id,
              blockedId: TEST_STORIES.todo2.id,
            }),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo2.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    await modal.switchTab("deps");
    await page.waitForTimeout(500);

    // Click the add dependency button
    const addBtn = page.getByTestId("deps-add-btn");
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Select the blocker story
    const storyOption = page.getByText(TEST_STORIES.todo1.title).first();
    await expect(storyOption).toBeVisible({ timeout: 5000 });
    await storyOption.click();

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("dependency list shows blocker stories", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo2.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    await modal.switchTab("deps");
    await page.waitForTimeout(500);

    // Dependencies list should be visible
    const depsList = page.getByTestId("deps-list");
    await expect(depsList).toBeVisible({ timeout: 5000 });
  });

  test("can remove a dependency", async ({ authenticatedPage: page }) => {
    let deleteCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo2.id}/dependencies/*`,
      (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo2.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    await modal.switchTab("deps");
    await page.waitForTimeout(500);

    // Look for a remove/delete button on existing dependency
    const removeBtn = page.getByTestId("deps-remove-btn").first()
      .or(page.getByRole("button", { name: /remove/i }).first());
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    await expect(async () => {
      expect(deleteCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
