import { test, expect } from "./fixtures/auth.fixture";
import { TEST_USER } from "./fixtures/test-data";

test.describe("Account Settings @medium", () => {
  test("profile page displays current user name and email", async ({ authenticatedPage: page }) => {
    await page.goto("/account/profile");

    const nameInput = page.getByTestId("profile-name");
    const emailDisplay = page.getByTestId("profile-email");

    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(emailDisplay).toBeVisible();

    // Should show the current user's info
    await expect(nameInput).toHaveValue(TEST_USER.name);
    await expect(emailDisplay).toContainText(TEST_USER.email);
  });

  test("can update profile name", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route("**/api/account/profile", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: TEST_USER.id,
            name: "Updated Name",
            email: TEST_USER.email,
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/account/profile");

    const nameInput = page.getByTestId("profile-name");
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    await nameInput.clear();
    await nameInput.fill("Updated Name");

    const saveBtn = page.getByTestId("profile-save");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("security page shows password change section", async ({ authenticatedPage: page }) => {
    await page.goto("/account/security");

    await expect(page.getByText(/password/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/change password/i).or(page.getByText(/update password/i)).first()).toBeVisible();
  });

  test("security page shows 2FA section", async ({ authenticatedPage: page }) => {
    await page.goto("/account/security");

    await expect(
      page.getByText(/two-factor/i).or(page.getByText(/2FA/i)).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("notification preferences page loads toggles", async ({ authenticatedPage: page }) => {
    await page.goto("/account/notifications");

    const emailToggle = page.getByTestId("notif-email-toggle");
    await expect(emailToggle).toBeVisible({ timeout: 10000 });
  });

  test("can toggle email notifications", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route("**/api/account/notifications", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ emailNotifications: false }),
        });
      }
      return route.continue();
    });

    await page.goto("/account/notifications");

    const emailToggle = page.getByTestId("notif-email-toggle");
    await expect(emailToggle).toBeVisible({ timeout: 10000 });
    await emailToggle.click();

    const saveBtn = page.getByTestId("notif-save");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
