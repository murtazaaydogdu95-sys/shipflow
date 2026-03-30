import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Story Attachments", () => {
  test("story detail shows attachments section", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Click a story card to open the detail modal
    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    // Story detail sheet should open
    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // The attachments upload area should be visible (it always renders)
    await expect(page.getByTestId("attach-upload-btn")).toBeVisible({ timeout: 5000 });
  });

  test("upload button is visible", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });

    const uploadBtn = page.getByTestId("attach-upload-btn");
    await expect(uploadBtn).toBeVisible({ timeout: 5000 });
    await expect(uploadBtn).toContainText(/upload/i);
  });

  test("can upload a file attachment", async ({ authenticatedPage: page }) => {
    let postCalled = false;

    // Mock the attachment upload POST endpoint
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}/attachments`,
      (route) => {
        if (route.request().method() === "POST") {
          postCalled = true;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "attachment-1",
              filename: "test-doc.pdf",
              url: "/uploads/test-doc.pdf",
              size: 1024,
              mimeType: "application/pdf",
              storyId: TEST_STORIES.todo1.id,
              createdAt: "2026-01-15T10:00:00.000Z",
            }),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });

    const uploadBtn = page.getByTestId("attach-upload-btn");
    await expect(uploadBtn).toBeVisible({ timeout: 5000 });

    // Find the file input inside the upload area and set a file
    const fileInput = uploadBtn.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "test-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    });

    // Verify the POST was called
    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("uploaded attachment appears in list", async ({ authenticatedPage: page }) => {
    const mockAttachment = {
      id: "attachment-1",
      filename: "design-spec.pdf",
      url: "/uploads/design-spec.pdf",
      size: 2048,
      mimeType: "application/pdf",
      storyId: TEST_STORIES.todo1.id,
      createdAt: "2026-01-15T10:00:00.000Z",
    };

    // Mock GET to return an attachment in the list
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}/attachments`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([mockAttachment]),
          });
        }
        if (route.request().method() === "POST") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockAttachment),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const sheet = page.locator("[role='dialog'][data-state='open']");
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // The attachment list should show the mocked attachment
    const attachList = page.getByTestId("attach-list");
    await expect(attachList).toBeVisible({ timeout: 5000 });
    await expect(attachList).toContainText("design-spec.pdf");
  });
});
