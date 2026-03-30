import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Empty States @low", () => {
  test("dashboard shows empty state when no projects exist", async ({ authenticatedPage: page }) => {
    // Mock projects API to return empty array
    await page.route("**/api/projects", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    await page.goto("/dashboard");

    // Should show empty state or "no projects" message
    await expect(
      page.getByText(/no projects/i)
        .or(page.getByText(/get started/i))
        .or(page.getByText(/create.*project/i))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("board shows empty columns when no stories in status", async ({ authenticatedPage: page }) => {
    // Mock stories API to return empty array
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}`);

    // Wait for the board tab and click it
    const boardTab = page.getByRole("tab", { name: "Board" });
    await expect(boardTab).toBeVisible({ timeout: 10000 });
    await boardTab.click();

    await page.waitForTimeout(500);

    // Board should render columns even with no stories
    await expect(
      page.getByText(/backlog/i).or(page.getByText(/todo/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("comments section shows empty state when no comments", async ({ authenticatedPage: page }) => {
    // Mock comments API to return empty array
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*/comments`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    // Navigate to board, open a story
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Switch to comments tab
    await modal.switchTab("comments");
    await page.waitForTimeout(500);

    // Should show empty state or just the comment input
    await expect(modal.commentInput).toBeVisible({ timeout: 5000 });
  });

  test("sprints page shows empty state when no sprints", async ({ authenticatedPage: page }) => {
    // Mock sprints API to return empty array
    await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/sprints`);

    // Should show empty state message
    await expect(
      page.getByText(/no sprints/i)
        .or(page.getByText(/create.*sprint/i))
        .or(page.getByText(/get started/i))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });
});
