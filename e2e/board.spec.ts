import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Board", () => {
  test("displays columns (Backlog, To Do, In Progress, Review, Done)", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await expect(board.getColumn("BACKLOG")).toBeVisible();
    await expect(board.getColumn("TODO")).toBeVisible();
    await expect(board.getColumn("IN_PROGRESS")).toBeVisible();
    await expect(board.getColumn("REVIEW")).toBeVisible();
    await expect(board.getColumn("DONE")).toBeVisible();
  });

  test("shows stories in correct columns by status", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Check that stories appear in the correct column (from seeded DB)
    const backlogCol = board.getColumn("BACKLOG");
    await expect(backlogCol.getByTestId(`story-card-${TEST_STORIES.backlog1.shortId}`)).toBeVisible();
    await expect(backlogCol.getByTestId(`story-card-${TEST_STORIES.backlog2.shortId}`)).toBeVisible();

    const todoCol = board.getColumn("TODO");
    await expect(todoCol.getByTestId(`story-card-${TEST_STORIES.todo1.shortId}`)).toBeVisible();

    const inProgressCol = board.getColumn("IN_PROGRESS");
    await expect(inProgressCol.getByTestId(`story-card-${TEST_STORIES.inProgress1.shortId}`)).toBeVisible();
  });

  test("shows story cards with shortId, title, priority badge", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const card = board.getStoryCard(TEST_STORIES.todo1.shortId);
    await expect(card).toBeVisible();
    await expect(card).toContainText(TEST_STORIES.todo1.shortId);
    await expect(card).toContainText(TEST_STORIES.todo1.title);
    // Priority badge shows first letter: H for HIGH
    await expect(card).toContainText("H");
  });

  test("toggles Icebox column with snowflake button", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Icebox should not be visible initially
    await expect(board.getColumn("ICEBOX")).not.toBeVisible();

    // Toggle icebox on
    await board.toggleIcebox();
    await expect(board.getColumn("ICEBOX")).toBeVisible();

    // Toggle icebox off
    await board.toggleIcebox();
    await expect(board.getColumn("ICEBOX")).not.toBeVisible();
  });

  test("opens story detail modal on card click", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const card = board.getStoryCard(TEST_STORIES.todo1.shortId);
    await card.click();

    // Story detail sheet should open (Radix Sheet uses role="dialog")
    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet).toContainText(TEST_STORIES.todo1.title);
    await expect(sheet).toContainText(TEST_STORIES.todo1.shortId);
  });

  test("navigates board with arrow keys", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Click on the board area to ensure keyboard events reach the board handler
    // (not captured by tab bar or other interactive elements)
    await board.getColumn("BACKLOG").click();
    await page.waitForTimeout(200);

    // Navigate right to reach TODO column (col 0=BACKLOG → col 1=TODO)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);

    // Press Enter to open the focused story
    await page.keyboard.press("Enter");

    // A story detail sheet should open
    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });
  });

  test("drags story between columns", async ({ authenticatedPage: page }) => {
    // Mock story move to prevent DB writes
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

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const sourceCard = board.getStoryCard(TEST_STORIES.backlog1.shortId);
    const targetColumn = board.getColumn("TODO");

    // Perform drag operation
    await sourceCard.dragTo(targetColumn);

    // After drag, the card may have a ghost duplicate.
    // Use .first() to avoid strict mode violation from dnd-kit drag overlay.
    await expect(sourceCard.first()).toBeVisible();
  });

  test("polls for updates via stories API", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Wait for a poll request to the stories endpoint
    const pollResponse = await page.waitForResponse(
      (response) =>
        response.url().includes(`/api/projects/${TEST_PROJECT.id}/stories`) &&
        response.request().method() === "GET" &&
        !response.url().includes("search="),
      { timeout: 10000 }
    );

    expect(pollResponse.status()).toBe(200);
  });
});
