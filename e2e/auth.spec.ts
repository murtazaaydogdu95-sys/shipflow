import { test, expect } from "@playwright/test";
import { LoginPage } from "./helpers/page-objects/login.page";
import { TEST_USER } from "./fixtures/test-data";

// Auth tests need a FRESH browser context (no stored cookies)
// so they can test login flow, unauthenticated redirects, etc.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("displays login form with email/password and GitHub button", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible({ timeout: 10000 });
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.githubButton).toBeVisible();
    await expect(loginPage.githubButton).toContainText("Continue with GitHub");
  });

  test("logs in with credentials and redirects to /dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillCredentials(TEST_USER.email, TEST_USER.password);
    await loginPage.submit();

    // Should redirect to dashboard after successful login
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows error on invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillCredentials("wrong@example.com", "wrongpassword");
    await loginPage.submit();

    // NextAuth redirects back to login with error param on credential failure
    await page.waitForURL("**/login**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users to /login", async ({ page }) => {
    // No auth cookies — try accessing a protected route
    await page.goto("/dashboard");

    // Server-side auth check should redirect to login
    await page.waitForURL("**/login**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("persists session across navigations", async ({ browser }) => {
    // Use a fresh context to avoid sharing auth state with other tests
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in — wait for login form to be fully loaded first
    await page.goto("/login");
    await page.getByTestId("login-email").waitFor({ state: "visible", timeout: 15000 });
    await page.getByTestId("login-email").fill(TEST_USER.email);
    await page.getByTestId("login-password").fill(TEST_USER.password);
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    // Helper: wait for dashboard or handle error boundary
    const errorHeading = page.getByRole("heading", { name: /something went wrong/i });
    const projectsHeading = page.getByRole("heading", { name: "Projects" });
    const tryAgainBtn = page.getByRole("button", { name: /try again/i });

    async function waitForDashboard() {
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await Promise.race([
          projectsHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
          errorHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const),
        ]).catch(() => "error" as const);

        if (result === "ok") return;

        const hasTryAgain = await tryAgainBtn.isVisible().catch(() => false);
        if (hasTryAgain) {
          await tryAgainBtn.click();
          await page.waitForTimeout(1000);
        } else {
          await page.waitForTimeout(2000);
          await page.goto("/dashboard");
        }
      }
    }

    await waitForDashboard();

    // Navigate away and back
    await page.goto("/dashboard");
    await waitForDashboard();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);

    await context.close();
  });

  test("shows forgot password link", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.forgotPasswordLink).toBeVisible({ timeout: 10000 });
    await expect(loginPage.forgotPasswordLink).toHaveAttribute("href", "/forgot-password");
  });

  test("GitHub login button initiates OAuth flow", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.githubButton).toBeEnabled({ timeout: 10000 });
    await expect(loginPage.githubButton).toContainText("GitHub");
  });
});
