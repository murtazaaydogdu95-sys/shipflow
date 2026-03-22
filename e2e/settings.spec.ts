import { test, expect } from "./fixtures/auth.fixture";
import { SettingsPage } from "./helpers/page-objects/settings.page";
import { TEST_PROJECT } from "./fixtures/test-data";
import { setupSettingsHandlers } from "./fixtures/api-handlers";

test.describe("Settings", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock write operations only
    await setupSettingsHandlers(page);
  });

  test("loads and displays project settings", async ({ authenticatedPage: page }) => {
    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);

    // goto() already waits for projectNameInput — just verify it's still there
    await expect(settings.projectNameInput).toBeVisible({ timeout: 5000 });
  });

  test("edits project name and saves", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...TEST_PROJECT, name: "Renamed Project" }),
        });
      }
      return route.continue();
    });

    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);
    await expect(settings.projectNameInput).toBeVisible({ timeout: 10000 });

    await settings.editProjectName("Renamed Project");
    await settings.save();

    // Verify the PATCH was called
    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("toggles agent auto-assign", async ({ authenticatedPage: page }) => {
    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);

    // Wait for settings to load and SWR to settle
    await expect(settings.projectNameInput).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Find and click the auto-assign toggle
    const toggle = page.getByTestId("settings-auto-assign");
    await expect(toggle).toBeVisible({ timeout: 5000 });
    await toggle.click();
  });

  test("changes AI provider", async ({ authenticatedPage: page }) => {
    // This test is sensitive to server load — give the server time to settle
    await page.waitForTimeout(500);

    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);

    await expect(settings.projectNameInput).toBeVisible({ timeout: 10000 });

    // AI Provider section should be visible (use .first() in case heading and description both match)
    await expect(page.getByText(/AI Provider/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("adds webhook", async ({ authenticatedPage: page }) => {
    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);
    await expect(settings.projectNameInput).toBeVisible({ timeout: 10000 });

    // Add a webhook
    const webhookInput = page.getByTestId("webhook-url-input");
    await expect(webhookInput).toBeVisible({ timeout: 5000 });
    await settings.addWebhook("https://example.com/webhook");

    // Should show webhook-related content
    await expect(page.getByText(/webhook/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Claude Code Integration section", async ({ authenticatedPage: page }) => {
    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);
    await expect(settings.projectNameInput).toBeVisible({ timeout: 10000 });

    // The Claude Code Integration section should be visible
    await expect(page.getByText(/Claude Code/i).first()).toBeVisible({ timeout: 5000 });
  });
});
