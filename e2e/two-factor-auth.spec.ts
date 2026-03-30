import { test, expect } from "./fixtures/auth.fixture";

test.describe("Two-Factor Authentication @high", () => {
  test("security page shows enable 2FA button when not enabled", async ({
    authenticatedPage: page,
  }) => {
    // Mock 2FA status as not enabled
    await page.route("**/api/account/2fa/status", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ enabled: false }),
        });
      }
      return route.continue();
    });

    await page.goto("/settings/security");

    const enable2faBtn = page.getByTestId("security-2fa-enable");
    await expect(enable2faBtn).toBeVisible({ timeout: 10000 });
  });

  test("clicking enable 2FA shows QR code and secret", async ({
    authenticatedPage: page,
  }) => {
    // Mock 2FA status
    await page.route("**/api/account/2fa/status", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ enabled: false }),
        });
      }
      return route.continue();
    });

    // Mock 2FA setup endpoint
    await page.route("**/api/account/2fa/setup", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            secret: "JBSWY3DPEHPK3PXP",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/settings/security");

    const enable2faBtn = page.getByTestId("security-2fa-enable");
    await expect(enable2faBtn).toBeVisible({ timeout: 10000 });
    await enable2faBtn.click();

    // QR code or secret should be visible
    const qrCode = page.getByTestId("2fa-qr-code").or(page.locator("img[alt*='QR']"));
    const secret = page.getByTestId("2fa-secret").or(page.getByText("JBSWY3DPEHPK3PXP"));
    await expect(qrCode.first().or(secret.first()).first()).toBeVisible({ timeout: 5000 });
  });

  test("entering valid code completes 2FA setup", async ({
    authenticatedPage: page,
  }) => {
    // Mock 2FA status
    await page.route("**/api/account/2fa/status", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ enabled: false }),
        });
      }
      return route.continue();
    });

    // Mock 2FA setup
    await page.route("**/api/account/2fa/setup", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            secret: "JBSWY3DPEHPK3PXP",
          }),
        });
      }
      return route.continue();
    });

    // Mock 2FA verify
    let verifyCalled = false;
    await page.route("**/api/account/2fa/verify", (route) => {
      if (route.request().method() === "POST") {
        verifyCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, enabled: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/settings/security");

    const enable2faBtn = page.getByTestId("security-2fa-enable");
    await expect(enable2faBtn).toBeVisible({ timeout: 10000 });
    await enable2faBtn.click();

    // Enter verification code
    const codeInput = page.getByTestId("2fa-code-input");
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    await codeInput.fill("123456");

    const verifyBtn = page.getByTestId("2fa-verify-btn");
    await verifyBtn.click();

    await expect(async () => {
      expect(verifyCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("verify-2fa page shows code input for 2FA-enabled users", async ({ browser }) => {
    // Use fresh context (no auth) to simulate 2FA verification page
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto("/verify-2fa");

    const codeInput = page.getByTestId("2fa-code-input");
    await expect(codeInput).toBeVisible({ timeout: 10000 });

    await context.close();
  });

  test("entering valid code on verify-2fa allows access", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    // Mock 2FA verification
    await page.route("**/api/auth/verify-2fa", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/verify-2fa");

    const codeInput = page.getByTestId("2fa-code-input");
    await expect(codeInput).toBeVisible({ timeout: 10000 });
    await codeInput.fill("123456");

    const verifyBtn = page.getByTestId("2fa-verify-btn");
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // After successful 2FA, should redirect to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);

    await context.close();
  });
});
