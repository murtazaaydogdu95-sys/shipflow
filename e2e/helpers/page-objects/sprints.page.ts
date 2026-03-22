import type { Page, Locator } from "@playwright/test";

export class SprintsPage {
  readonly page: Page;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.getByTestId("create-sprint-btn");
  }

  /**
   * Navigate to sprints. On error boundary, clicks "Try again" or retries.
   */
  async goto(projectId: string) {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const sprintHeading = this.page.getByRole("heading", { name: /sprint/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto(`/projects/${projectId}/sprints`);
      }

      const result = await Promise.race([
        sprintHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
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
          await this.page.goto(`/projects/${projectId}/sprints`);
        }
      }
    }

    await sprintHeading.waitFor({ state: "visible", timeout: 8000 });
  }

  async createSprint(name: string, goal?: string) {
    await this.createButton.click();
    await this.page.locator("#sprint-name").fill(name);
    if (goal) {
      await this.page.locator("#sprint-goal").fill(goal);
    }
    await this.page.getByRole("button", { name: "Create Sprint" }).click();
  }

  async changeStatus(sprintName: string, action: "Start" | "Complete Sprint") {
    const sprintCard = this.page.locator("div").filter({ hasText: sprintName }).first();
    await sprintCard.getByRole("button", { name: action }).click();
  }
}
