import type { Page, Locator } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly saveButton: Locator;
  readonly projectNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByTestId("settings-save-btn");
    this.projectNameInput = page.getByTestId("settings-project-name");
  }

  /**
   * Navigate to settings. On error boundary, clicks "Try again" or retries.
   */
  async goto(projectId: string) {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto(`/projects/${projectId}/settings`);
      }

      const result = await Promise.race([
        this.projectNameInput.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
        errorHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const),
      ]).catch(() => "error" as const);

      if (result === "ok") {
        await this.page.waitForTimeout(300);
        return;
      }

      if (attempt < 3) {
        const hasTryAgain = await tryAgainBtn.isVisible().catch(() => false);
        if (hasTryAgain) {
          await tryAgainBtn.click();
          await this.page.waitForTimeout(1000);
        } else {
          await this.page.waitForTimeout(2000);
          await this.page.goto(`/projects/${projectId}/settings`);
        }
      }
    }

    await this.projectNameInput.waitFor({ state: "visible", timeout: 8000 });
    await this.page.waitForTimeout(300);
  }

  async editProjectName(newName: string) {
    await this.projectNameInput.clear();
    await this.projectNameInput.fill(newName);
  }

  async toggleAutoAssign() {
    await this.page.getByTestId("settings-auto-assign").click();
  }

  async addWebhook(url: string) {
    const input = this.page.getByTestId("webhook-url-input");
    // Wait for the input to be stable (not detached by SWR re-render)
    await input.waitFor({ state: "visible", timeout: 5000 });
    await input.fill(url);
    await this.page.getByTestId("webhook-add-btn").click();
  }

  async save() {
    await this.saveButton.click();
  }
}
