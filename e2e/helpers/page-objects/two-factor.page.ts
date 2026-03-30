import type { Page, Locator } from "@playwright/test";

export class TwoFactorPage {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  readonly useBackupLink: Locator;
  readonly qrCode: Locator;

  constructor(page: Page) {
    this.page = page;
    this.codeInput = page.getByTestId("2fa-code-input");
    this.verifyButton = page.getByTestId("2fa-verify-btn");
    this.useBackupLink = page.getByTestId("2fa-use-backup");
    this.qrCode = page.locator("img[alt='QR Code']");
  }

  /**
   * Navigate to the 2FA verification page. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { name: /two-factor/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/verify-2fa");
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
          await this.page.goto("/verify-2fa");
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  async enterCode(code: string) {
    await this.codeInput.fill(code);
  }

  async verify() {
    await this.verifyButton.click();
  }
}
