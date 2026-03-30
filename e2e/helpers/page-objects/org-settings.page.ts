import type { Page, Locator } from "@playwright/test";

export class OrgSettingsPage {
  readonly page: Page;
  readonly orgNameInput: Locator;
  readonly saveButton: Locator;
  readonly planBadge: Locator;
  readonly launchDateInput: Locator;
  readonly deleteOrgButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orgNameInput = page.getByTestId("org-name-input");
    this.saveButton = page.getByTestId("org-save-btn");
    this.planBadge = page.locator("input[disabled]").filter({ hasText: /FREE|PRO|PRO_MAX/ });
    this.launchDateInput = page.getByTestId("launch-date-input");
    this.deleteOrgButton = page.getByTestId("org-delete-btn");
  }

  /**
   * Navigate to org settings. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { name: /organization settings/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/org/settings");
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
          await this.page.goto("/org/settings");
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  async editOrgName(newName: string) {
    await this.orgNameInput.clear();
    await this.orgNameInput.fill(newName);
  }

  async save() {
    await this.saveButton.click();
  }
}
