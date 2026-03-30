import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Error Handling @low", () => {
  test("404 page shown for non-existent route", async ({ authenticatedPage: page }) => {
    await page.goto("/this-route-does-not-exist-12345");

    await expect(
      page.getByText(/404/i).or(page.getByText(/not found/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("error boundary shows fallback UI on component error", async ({ authenticatedPage: page }) => {
    // Navigate to a project page with broken data to trigger error boundary
    await page.route(`**/api/projects/broken-project-id`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        // Return malformed data to potentially trigger a render error
        body: JSON.stringify(null),
      });
    });

    await page.goto("/projects/broken-project-id");

    // Should show error boundary or redirect
    await expect(
      page.getByText(/something went wrong/i)
        .or(page.getByText(/error/i))
        .or(page.getByText(/not found/i))
        .or(page.getByRole("button", { name: /try again/i }))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("API 500 response shows error toast", async ({ authenticatedPage: page }) => {
    // Mock a story PATCH that returns 500
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*`, (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      }
      return route.continue();
    });

    // Navigate to board and try to edit a story
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Edit and save to trigger the 500 error
    await modal.editTitle("This should fail");
    await modal.save();

    // Should show an error toast or error message
    await expect(
      page.getByText(/error/i).or(page.getByText(/failed/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("rate limit 429 response shows appropriate message", async ({ authenticatedPage: page }) => {
    // Mock API to return 429
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*`, (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "Too many requests. Please try again later." }),
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

    await modal.editTitle("Rate limited request");
    await modal.save();

    // Should show rate limit or error message
    await expect(
      page.getByText(/too many/i)
        .or(page.getByText(/rate limit/i))
        .or(page.getByText(/try again/i))
        .or(page.getByText(/error/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });
});
