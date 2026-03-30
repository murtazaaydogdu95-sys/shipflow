import type { Page, Locator } from "@playwright/test";

export class OnboardingPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly workspaceNameInput: Locator;
  readonly continueButton: Locator;
  readonly skipButton: Locator;
  readonly completeButton: Locator;
  readonly stepIndicators: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole("heading", { name: /welcome/i });
    this.workspaceNameInput = page.getByTestId("onboarding-workspace-name");
    this.continueButton = page.getByTestId("onboarding-continue");
    this.skipButton = page.getByTestId("onboarding-skip");
    this.completeButton = page.getByTestId("onboarding-complete");
    this.stepIndicators = page.locator("[class*='rounded-full']");
  }

  /**
   * Navigate to the onboarding page. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/onboarding");
      }

      const result = await Promise.race([
        this.welcomeHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
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
          await this.page.goto("/onboarding");
        }
      }
    }

    await this.welcomeHeading.waitFor({ state: "visible", timeout: 8000 });
  }

  async fillWorkspaceName(name: string) {
    await this.workspaceNameInput.fill(name);
  }

  async continue() {
    await this.continueButton.click();
  }

  async skip() {
    await this.skipButton.click();
  }

  async complete() {
    await this.completeButton.click();
  }
}
