import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Export", () => {
  test("downloads stories as JSON", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Track export URL via page.on("popup") for the new tab opened by window.open
    // Also intercept on the opened page if possible
    let exportTriggered = false;

    // Override window.open to capture the URL instead of opening a new tab
    await page.evaluate(() => {
      (window as unknown as { __exportUrl: string }).__exportUrl = "";
      const origOpen = window.open;
      window.open = function (url?: string | URL, ...rest: unknown[]) {
        if (url && String(url).includes("export")) {
          (window as unknown as { __exportUrl: string }).__exportUrl = String(url);
          return null;
        }
        return origOpen.apply(this, [url, ...rest] as Parameters<typeof origOpen>);
      };
    });

    // Click export select trigger, then pick JSON via keyboard
    await page.getByTestId("board-export-btn").click();
    // Wait for dropdown to appear
    const jsonOption = page.getByRole("option", { name: /JSON/i });
    await expect(jsonOption).toBeVisible({ timeout: 3000 });
    // Use DOM click to bypass viewport positioning issue
    await jsonOption.evaluate((el) => (el as HTMLElement).click());

    // Verify export was triggered with correct format
    const exportUrl = await page.evaluate(() => (window as unknown as { __exportUrl: string }).__exportUrl);
    expect(exportUrl).toContain("format=json");
  });

  test("downloads stories as CSV", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await page.evaluate(() => {
      (window as unknown as { __exportUrl: string }).__exportUrl = "";
      const origOpen = window.open;
      window.open = function (url?: string | URL, ...rest: unknown[]) {
        if (url && String(url).includes("export")) {
          (window as unknown as { __exportUrl: string }).__exportUrl = String(url);
          return null;
        }
        return origOpen.apply(this, [url, ...rest] as Parameters<typeof origOpen>);
      };
    });

    await page.getByTestId("board-export-btn").click();
    const csvOption = page.getByRole("option", { name: /CSV/i });
    await expect(csvOption).toBeVisible({ timeout: 3000 });
    await csvOption.evaluate((el) => (el as HTMLElement).click());

    const exportUrl = await page.evaluate(() => (window as unknown as { __exportUrl: string }).__exportUrl);
    expect(exportUrl).toContain("format=csv");
  });

  test("export button is visible on board", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await expect(page.getByTestId("board-export-btn")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("board-export-btn")).toBeEnabled();
  });
});
