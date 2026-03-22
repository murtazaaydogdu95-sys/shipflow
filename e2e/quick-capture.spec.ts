import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { QuickCapturePage } from "./helpers/page-objects/quick-capture.page";
import { TEST_PROJECT } from "./fixtures/test-data";
import { makeStory } from "./fixtures/test-data";

test.describe("Quick Capture", () => {
  test("opens dialog via Cmd+K", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Cmd+K opens the command palette first
    await page.keyboard.press("Meta+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test("types a raw idea", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();

    await quickCapture.typeIdea("Add webhook for failed payments");
    await expect(quickCapture.input).toHaveValue("Add webhook for failed payments");
  });

  test("creates story without AI rewrite", async ({ authenticatedPage: page }) => {
    // Mock story creation POST
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(
            makeStory({
              shortId: "SF-100",
              title: "Add webhook for failed payments",
              rawInput: "Add webhook for failed payments",
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
    await quickCapture.typeIdea("Add webhook for failed payments");
    await quickCapture.clickCreate();

    // Dialog should close after creation
    await expect(quickCapture.dialog).not.toBeVisible({ timeout: 5000 });
  });

  test("shows template picker", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();

    // Click on Templates tab
    const templatesTab = page.getByRole("tab", { name: /templates/i });
    await expect(templatesTab).toBeVisible({ timeout: 5000 });
    await templatesTab.click();

    // Should show template options
    await expect(page.getByText(/auth/i).or(page.getByText(/CRUD/i)).first()).toBeVisible({ timeout: 5000 });
  });

  test("detects natural language commands", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const quickCapture = new QuickCapturePage(page);
    await quickCapture.open();

    await quickCapture.typeIdea("move SF-004 to done");

    // Should show command detection UI (Execute button or command info)
    await expect(page.getByText(/command/i).or(page.getByText(/execute/i)).first()).toBeVisible({ timeout: 5000 });
  });

  test("closes after creation with toast", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(
            makeStory({
              shortId: "SF-101",
              title: "Test story creation",
              rawInput: "Test story creation",
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
    await quickCapture.createStory("Test story creation");

    // Dialog should close
    await expect(quickCapture.dialog).not.toBeVisible({ timeout: 5000 });

    // Toast should appear
    await expect(page.getByText(/created/i).first()).toBeVisible({ timeout: 5000 });
  });
});
