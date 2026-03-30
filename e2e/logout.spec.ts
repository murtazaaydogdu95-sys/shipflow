import { test, expect } from "./fixtures/auth.fixture";

test.describe("Logout @critical", () => {
  test("user nav dropdown shows logout option", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    const userNavTrigger = page.getByTestId("user-nav-trigger");
    await expect(userNavTrigger).toBeVisible({ timeout: 10000 });
    await userNavTrigger.click();

    const logoutOption = page.getByTestId("user-nav-logout");
    await expect(logoutOption).toBeVisible({ timeout: 5000 });
  });

  test("clicking logout destroys session and redirects to /login", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    const userNavTrigger = page.getByTestId("user-nav-trigger");
    await expect(userNavTrigger).toBeVisible({ timeout: 10000 });
    await userNavTrigger.click();

    const logoutOption = page.getByTestId("user-nav-logout");
    await expect(logoutOption).toBeVisible({ timeout: 5000 });
    await logoutOption.click();

    // Should redirect to login page after logout
    await page.waitForURL("**/login**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("after logout, accessing /dashboard redirects to /login", async ({
    browser,
  }) => {
    // Use a fresh context to simulate a full logout flow
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in first
    await page.goto("/login");
    await page.getByTestId("login-email").waitFor({ state: "visible", timeout: 15000 });
    await page.getByTestId("login-email").fill("test@codepylot.dev");
    await page.getByTestId("login-password").fill("testpassword123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    // Now logout
    const userNavTrigger = page.getByTestId("user-nav-trigger");
    await expect(userNavTrigger).toBeVisible({ timeout: 10000 });
    await userNavTrigger.click();

    const logoutOption = page.getByTestId("user-nav-logout");
    await expect(logoutOption).toBeVisible({ timeout: 5000 });
    await logoutOption.click();

    await page.waitForURL("**/login**", { timeout: 15000 });

    // Try to access dashboard again without auth
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});
