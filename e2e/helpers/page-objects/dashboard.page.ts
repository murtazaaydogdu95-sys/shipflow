import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly createProjectButton: Locator;
  readonly orgSwitcher: Locator;
  readonly usageSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createProjectButton = page.getByRole("button", { name: /create.*project|new.*project/i });
    this.orgSwitcher = page.getByTestId("org-switcher");
    this.usageSection = page.getByTestId("dashboard-usage");
  }

  /**
   * Navigate to the dashboard. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { name: /dashboard|projects/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/dashboard");
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
          await this.page.goto("/dashboard");
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  getProjectCard(projectName: string): Locator {
    return this.page.locator(`[data-testid="project-card"]`).filter({ hasText: projectName });
  }

  async clickProject(projectName: string) {
    const card = this.getProjectCard(projectName);
    await card.waitFor({ state: "visible", timeout: 10000 });
    await card.click();
  }

  async switchOrg(orgSlug: string) {
    await this.orgSwitcher.click();
    await this.page.getByTestId(`org-switcher-item-${orgSlug}`).click();
  }
}
