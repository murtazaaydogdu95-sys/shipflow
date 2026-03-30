import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.resolve(__dirname, ".auth/user.json");
const adminAuthFile = path.resolve(__dirname, ".auth/admin.json");
const memberAuthFile = path.resolve(__dirname, ".auth/member.json");

/**
 * This setup project logs in once via the real login form and saves
 * the auth state (JWT cookie) to a file. All other test projects
 * load this storageState so they're already authenticated.
 */
setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");
  await expect(page.getByTestId("login-email")).toBeVisible({ timeout: 15000 });

  // Wait for NextAuth CSRF token to be fetched (prevents auth/error redirect)
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/auth/csrf") && resp.status() === 200,
    { timeout: 10000 }
  ).catch(() => {
    // CSRF may already have been fetched; continue anyway
  });

  // Fill in credentials for the seeded test user
  await page.getByTestId("login-email").fill("test@codepylot.dev");
  await page.getByTestId("login-password").fill("testpassword123");
  await page.getByTestId("login-submit").click();

  // Wait for redirect to dashboard after successful login
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await expect(page).toHaveURL(/\/dashboard/);

  // Save the authenticated state (cookies including JWT)
  await page.context().storageState({ path: authFile });
});

setup("authenticate-admin", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-email")).toBeVisible({ timeout: 15000 });
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/auth/csrf") && resp.status() === 200,
    { timeout: 10000 }
  ).catch(() => {});
  await page.getByTestId("login-email").fill("admin@codepylot.dev");
  await page.getByTestId("login-password").fill("adminpassword123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.context().storageState({ path: adminAuthFile });
});

setup("authenticate-member", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-email")).toBeVisible({ timeout: 15000 });
  await page.waitForResponse(
    (resp) => resp.url().includes("/api/auth/csrf") && resp.status() === 200,
    { timeout: 10000 }
  ).catch(() => {});
  await page.getByTestId("login-email").fill("member@codepylot.dev");
  await page.getByTestId("login-password").fill("memberpassword123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.context().storageState({ path: memberAuthFile });
});
