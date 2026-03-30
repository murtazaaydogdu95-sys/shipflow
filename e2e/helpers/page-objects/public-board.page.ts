import type { Page, Locator } from "@playwright/test";

export class PublicBoardPage {
  readonly page: Page;
  readonly boardTitle: Locator;
  readonly shareButton: Locator;
  readonly signupCTA: Locator;
  readonly columns: Locator;

  constructor(page: Page) {
    this.page = page;
    this.boardTitle = page.getByTestId("public-board-title");
    this.shareButton = page.getByTestId("public-board-share-btn");
    this.signupCTA = page.getByTestId("public-board-signup-cta");
    this.columns = page.getByTestId("public-board-column");
  }

  /**
   * Navigate to the public board page. On error boundary, clicks "Try again" or retries.
   */
  async goto(slug: string) {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto(`/board/${slug}`);
      }

      const result = await Promise.race([
        this.boardTitle.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
        errorHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const),
      ]).catch(() => "error" as const);

      if (result === "ok") return;

      if (attempt < 3) {
        const hasTryAgain = await tryAgainBtn.isVisible().catch(() => false);
        if (hasTryAgain) {
          await tryAgainBtn.click();
          await this.page.waitForTimeout(1000);
        } else {
          await this.page.waitForTimeout(2000);
          await this.page.goto(`/board/${slug}`);
        }
      }
    }

    await this.boardTitle.waitFor({ state: "visible", timeout: 8000 });
  }

  getColumn(status: string): Locator {
    return this.page.getByTestId(`public-board-column-${status}`);
  }

  getStoryCard(shortId: string): Locator {
    return this.page.locator(".rounded-lg.border.bg-card").filter({ hasText: shortId });
  }
}
