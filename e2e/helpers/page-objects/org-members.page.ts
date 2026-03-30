import type { Page, Locator } from "@playwright/test";

export class OrgMembersPage {
  readonly page: Page;
  readonly inviteEmailInput: Locator;
  readonly inviteRoleSelect: Locator;
  readonly inviteButton: Locator;
  readonly membersContainer: Locator;
  readonly pendingInvitesSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteEmailInput = page.getByTestId("invite-email");
    this.inviteRoleSelect = page.getByTestId("invite-role");
    this.inviteButton = page.getByTestId("invite-btn");
    this.membersContainer = page.locator(".space-y-2").first();
    this.pendingInvitesSection = page.getByRole("heading", { name: /pending invitations/i });
  }

  /**
   * Navigate to org members page. On error boundary, clicks "Try again" or retries.
   */
  async goto() {
    const errorHeading = this.page.getByRole("heading", { name: /something went wrong/i });
    const tryAgainBtn = this.page.getByRole("button", { name: /try again/i });
    const heading = this.page.getByRole("heading", { name: /members/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt === 1) {
        await this.page.goto("/org/members");
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
          await this.page.goto("/org/members");
        }
      }
    }

    await heading.waitFor({ state: "visible", timeout: 8000 });
  }

  getMemberRow(email: string): Locator {
    const sanitized = email.replace(/[^a-zA-Z0-9]/g, "-");
    return this.page.getByTestId(`member-row-${sanitized}`);
  }

  async inviteMember(email: string, role?: string) {
    await this.inviteEmailInput.fill(email);
    if (role) {
      await this.inviteRoleSelect.click();
      await this.page.getByRole("option", { name: role }).click();
    }
    await this.inviteButton.click();
  }
}
