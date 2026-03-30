import type { Page, Locator } from "@playwright/test";

export class AccountPage {
  readonly page: Page;
  readonly profileName: Locator;
  readonly profileEmail: Locator;
  readonly profileSave: Locator;
  readonly securityEnable2FA: Locator;
  readonly securityDisable2FA: Locator;
  readonly securityChangePassword: Locator;
  readonly notifEmailToggle: Locator;
  readonly notifSave: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileName = page.getByTestId("profile-name");
    this.profileEmail = page.getByTestId("profile-email");
    this.profileSave = page.getByTestId("profile-save");
    this.securityEnable2FA = page.getByTestId("security-2fa-enable");
    this.securityDisable2FA = page.getByTestId("security-2fa-disable");
    this.securityChangePassword = page.getByTestId("security-change-password");
    this.notifEmailToggle = page.getByTestId("notif-email-toggle");
    this.notifSave = page.getByTestId("notif-save");
  }

  /**
   * Navigate to a specific account tab. On error boundary, clicks "Try again" or retries.
   */
  async goto(tab: "profile" | "security" | "notifications" = "profile") {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { level: 1 });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto(`/account/${tab}`);
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
          await this.page.goto(`/account/${tab}`);
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  async updateName(newName: string) {
    await this.profileName.clear();
    await this.profileName.fill(newName);
  }

  async saveProfile() {
    await this.profileSave.click();
  }
}
