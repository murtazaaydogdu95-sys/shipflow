import { test, expect } from "@playwright/test";

// Password reset tests are unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Password Reset @high", () => {
  test("forgot password page loads with email input and submit button", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await expect(page.getByTestId("forgot-email")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("forgot-submit")).toBeVisible();
  });

  test("submitting email shows success message", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/forgot-password");

    await page.getByTestId("forgot-email").waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("forgot-email").fill("test@codepylot.dev");
    await page.getByTestId("forgot-submit").click();

    await expect(page.getByTestId("forgot-success")).toBeVisible({ timeout: 5000 });
  });

  test("shows success even for non-existent email (prevents enumeration)", async ({
    page,
  }) => {
    await page.route("**/api/auth/forgot-password", (route) => {
      if (route.request().method() === "POST") {
        // Server always returns success to prevent email enumeration
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/forgot-password");

    await page.getByTestId("forgot-email").waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("forgot-email").fill("nonexistent@example.com");
    await page.getByTestId("forgot-submit").click();

    // Should still show success message (no information leak)
    await expect(page.getByTestId("forgot-success")).toBeVisible({ timeout: 5000 });
  });

  test("back to login link works", async ({ page }) => {
    await page.goto("/forgot-password");

    const backLink = page.getByTestId("forgot-back-to-login").or(
      page.getByRole("link", { name: /back to login/i }).or(
        page.getByRole("link", { name: /login/i })
      )
    );
    await expect(backLink.first()).toBeVisible({ timeout: 10000 });
    await backLink.first().click();

    await page.waitForURL("**/login**", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("reset password page validates password length", async ({ page }) => {
    // Navigate to reset page with a mock token
    await page.goto("/reset-password?token=mock-reset-token");

    const passwordInput = page.getByTestId("reset-password");
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Enter a short password
    await passwordInput.fill("abc");
    await page.getByTestId("reset-submit").click();

    // Should show validation error (password too short)
    const errorMsg = page.getByText(/password/i).and(
      page.getByText(/character/i).or(page.getByText(/short/i)).or(page.getByText(/min/i))
    );
    await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto("/reset-password?token=test-valid-token");

    const passwordInput = page.getByTestId("reset-password");
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    await passwordInput.fill("newpassword123!");
    await page.getByTestId("reset-confirm").fill("differentpassword");
    await page.getByTestId("reset-submit").click();

    // The page shows "Passwords do not match" error
    await expect(page.getByText(/passwords? (do not|don't) match/i)).toBeVisible({ timeout: 5000 });
  });

  test("reset password page accepts valid new password", async ({ page }) => {
    let postCalled = false;
    await page.route("**/api/auth/reset-password", (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/reset-password?token=mock-reset-token");

    const passwordInput = page.getByTestId("reset-password");
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    await passwordInput.fill("newSecurePassword123!");
    await page.getByTestId("reset-submit").click();

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
