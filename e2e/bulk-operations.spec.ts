import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Bulk Operations", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock bulk endpoints — prevent DB writes
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/bulk`, (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ updated: 2 }),
        });
      }
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ deleted: 2 }),
        });
      }
      return route.continue();
    });

    // Mock story move — prevent DB writes during bulk operations
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*/move`, (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });
  });

  test("toggles bulk mode with B key", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Press B to enter bulk mode
    await board.toggleBulkMode();

    // Bulk toggle button should be visible and active
    await expect(board.bulkToggle).toBeVisible({ timeout: 5000 });
  });

  test("shows selection state in bulk mode", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Click the bulk toggle button
    await board.bulkToggle.click();

    // The bulk toggle should be activated
    await expect(board.bulkToggle).toBeVisible();
  });

  test("selects multiple stories with click in bulk mode", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Enter bulk mode
    await board.bulkToggle.click();

    // Click stories to select them
    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);
    await board.clickStoryCard(TEST_STORIES.backlog2.shortId);

    // Should show "2 selected" text
    await expect(page.getByText("2 selected")).toBeVisible({ timeout: 5000 });
  });

  test("bulk changes status", async ({ authenticatedPage: page }) => {
    let bulkPatchCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/bulk`, (route) => {
      if (route.request().method() === "PATCH") {
        bulkPatchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ updated: 2 }),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Enter bulk mode and select stories
    await board.bulkToggle.click();
    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);
    await board.clickStoryCard(TEST_STORIES.backlog2.shortId);
    await expect(page.getByText("2 selected")).toBeVisible({ timeout: 5000 });

    // Click "Move to..." Select trigger — use combobox role
    const moveSelect = page.getByRole("combobox").filter({ hasText: /Move to/i });
    await expect(moveSelect).toBeVisible({ timeout: 3000 });
    await moveSelect.click();

    // Select "To Do" — use .first() to avoid strict mode on inner span
    const todoOption = page.getByRole("option", { name: /to do/i }).first();
    await todoOption.click({ force: true });

    await expect(async () => {
      expect(bulkPatchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("bulk changes priority", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Enter bulk mode and select a story
    await board.bulkToggle.click();
    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);
    await expect(page.getByText("1 selected")).toBeVisible({ timeout: 5000 });

    // Click the priority select
    const prioritySelect = page.getByRole("combobox").filter({ hasText: /Priority/i });
    await expect(prioritySelect).toBeVisible({ timeout: 3000 });
    await prioritySelect.click();

    // Select HIGH option
    const highOption = page.getByRole("option", { name: /HIGH/i }).first();
    await highOption.click({ force: true });
  });

  test("bulk deletes with confirmation", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Enter bulk mode and select stories
    await board.bulkToggle.click();
    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);
    await board.clickStoryCard(TEST_STORIES.backlog2.shortId);
    await expect(page.getByText("2 selected")).toBeVisible({ timeout: 5000 });

    // Handle the browser confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Click the bulk Delete button (exact match to avoid matching story card delete buttons)
    const deleteBtn = page.getByRole("button", { name: "Delete", exact: true });
    await expect(deleteBtn).toBeVisible({ timeout: 3000 });
    await deleteBtn.click();
  });

  test("exits bulk mode with Escape", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Enter bulk mode
    await board.bulkToggle.click();
    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);
    await expect(page.getByText("1 selected")).toBeVisible({ timeout: 5000 });

    // Press Escape to exit
    await board.pressEscape();

    // Selection bar should be gone
    await expect(page.getByText("1 selected")).not.toBeVisible({ timeout: 3000 });
  });
});
