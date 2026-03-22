import type { Page, Locator } from "@playwright/test";

export class BoardPage {
  readonly page: Page;
  readonly exportButton: Locator;
  readonly bulkToggle: Locator;
  readonly iceboxToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exportButton = page.getByTestId("board-export-btn");
    this.bulkToggle = page.getByTestId("board-bulk-toggle");
    this.iceboxToggle = page.getByTestId("board-icebox-toggle");
  }

  /**
   * Navigate to the board page. On error boundary, clicks "Try again" or retries navigation.
   */
  async goto(projectId: string) {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const boardTab = this.page.getByRole("tab", { name: "Board" });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto(`/projects/${projectId}`);
      }

      const result = await Promise.race([
        boardTab.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
        errorHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const),
      ]).catch(() => "error" as const);

      if (result === "ok") {
        await boardTab.click();
        return;
      }

      // Error boundary — click "Try again" button (faster than full reload)
      if (attempt < 3) {
        const hasTryAgain = await tryAgainBtn.isVisible().catch(() => false);
        if (hasTryAgain) {
          await tryAgainBtn.click();
          await this.page.waitForTimeout(1000);
        } else {
          await this.page.waitForTimeout(2000);
          await this.page.goto(`/projects/${projectId}`);
        }
      }
    }

    // Final fallback
    await boardTab.waitFor({ state: "visible", timeout: 8000 });
    await boardTab.click();
  }

  getColumn(status: string): Locator {
    return this.page.getByTestId(`board-column-${status}`);
  }

  getStoryCard(shortId: string): Locator {
    return this.page.getByTestId(`story-card-${shortId}`);
  }

  /**
   * Wait for a story card to render and click it.
   * Use this instead of getStoryCard().click() to avoid clicking detached elements.
   */
  async clickStoryCard(shortId: string) {
    const card = this.getStoryCard(shortId);
    await card.waitFor({ state: "visible", timeout: 10000 });
    await card.click();
  }

  async waitForBoard() {
    const backlogCol = this.getColumn("BACKLOG");
    await backlogCol.waitFor({ state: "visible", timeout: 10000 });
    // Allow SWR poll to settle so cards don't get detached mid-click
    await this.page.waitForTimeout(500);
  }

  async openQuickCapture() {
    await this.page.keyboard.press("Meta+k");
  }

  async toggleBulkMode() {
    await this.page.keyboard.press("b");
  }

  async toggleIcebox() {
    await this.iceboxToggle.click();
  }

  async navigateWithArrowKeys(direction: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown") {
    await this.page.keyboard.press(direction);
  }

  async pressEnter() {
    await this.page.keyboard.press("Enter");
  }

  async pressEscape() {
    await this.page.keyboard.press("Escape");
  }

  async selectStoryWithSpace() {
    await this.page.keyboard.press("Space");
  }
}
