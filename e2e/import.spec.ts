import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT, makeStory } from "./fixtures/test-data";

test.describe("Story Import", () => {
  test("import button is visible on board toolbar", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await expect(page.getByTestId("board-import-btn")).toBeVisible({ timeout: 5000 });
  });

  test("import dialog opens when clicking import button", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await page.getByTestId("board-import-btn").click();

    // The import dialog uses Radix Dialog which renders with role="dialog"
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText("Import Stories");
  });

  test("can select a CSV file for import", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await page.getByTestId("board-import-btn").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Use setInputFiles on the hidden file input
    const fileInput = page.getByTestId("import-file-input");
    await fileInput.setInputFiles({
      name: "stories.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,status,priority\nTest Story,BACKLOG,MEDIUM\n"),
    });

    // After selecting a file, the file name should appear in the dialog
    await expect(dialog).toContainText("stories.csv");
  });

  test("submitting import triggers API call", async ({ authenticatedPage: page }) => {
    let postCalled = false;

    // Mock the import POST endpoint
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/import`, (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            imported: 1,
            errors: [],
            stories: [makeStory({ title: "Test Story" })],
          }),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await page.getByTestId("board-import-btn").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select a CSV file
    const fileInput = page.getByTestId("import-file-input");
    await fileInput.setInputFiles({
      name: "stories.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,status,priority\nTest Story,BACKLOG,MEDIUM\n"),
    });

    // Wait for file to be processed
    await expect(dialog).toContainText("stories.csv");

    // Click the import submit button
    const submitBtn = page.getByTestId("import-submit-btn");
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    await submitBtn.click();

    // Verify the POST was called
    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("shows success message after import", async ({ authenticatedPage: page }) => {
    // Mock the import POST endpoint with a success response
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/import`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            imported: 2,
            errors: [],
            stories: [
              makeStory({ title: "Story A" }),
              makeStory({ title: "Story B" }),
            ],
          }),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await page.getByTestId("board-import-btn").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const fileInput = page.getByTestId("import-file-input");
    await fileInput.setInputFiles({
      name: "stories.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,status,priority\nStory A,BACKLOG,HIGH\nStory B,TODO,MEDIUM\n"),
    });

    await expect(dialog).toContainText("stories.csv");

    const submitBtn = page.getByTestId("import-submit-btn");
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    await submitBtn.click();

    // After successful import, the dialog should show a success indicator
    await expect(dialog).toContainText(/Imported 2 stories/i, { timeout: 5000 });
  });
});
