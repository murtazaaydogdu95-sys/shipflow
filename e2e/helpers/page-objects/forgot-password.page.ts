import type { Page, Locator } from "@playwright/test";

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly backToLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("forgot-email");
    this.submitButton = page.getByTestId("forgot-submit");
    this.successMessage = page.getByTestId("forgot-success");
    this.backToLoginLink = page.getByTestId("forgot-back-to-login");
  }

  /**
   * Navigate to the forgot password page. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { name: /reset password/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/forgot-password");
      }

      const result = await Promise.race([
        heading.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
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
          await this.page.goto("/forgot-password");
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  async requestReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
