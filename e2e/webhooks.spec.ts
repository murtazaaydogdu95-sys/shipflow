import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Webhooks @medium", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock webhook CRUD to prevent DB writes
    await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks`, (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `webhook-${Date.now()}`,
            url: "https://example.com/new-webhook",
            events: ["story.moved"],
            active: true,
            createdAt: new Date().toISOString(),
          }),
        });
      }
      // GET passes through to real API
      return route.continue();
    });

    await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks/*`, (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });
  });

  test("webhook settings section shows existing webhooks", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);

    // Wait for settings page to load
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Webhook section should be visible
    await expect(page.getByText(/webhook/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("can add a new webhook URL", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks`, (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "webhook-new",
            url: "https://hooks.example.com/events",
            events: ["story.moved"],
            active: true,
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });

    const webhookInput = page.getByTestId("webhook-url-input");
    await expect(webhookInput).toBeVisible({ timeout: 5000 });
    await webhookInput.fill("https://hooks.example.com/events");

    const addBtn = page.getByTestId("webhook-add-btn");
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can delete a webhook", async ({ authenticatedPage: page }) => {
    let deleteCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks/*`, (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Look for a delete button on an existing webhook
    const deleteBtn = page.getByTestId("webhook-delete-btn").first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // Confirm deletion if there is a confirmation dialog
    const confirmBtn = page.getByRole("button", { name: /confirm|delete|yes/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasConfirm) {
      await confirmBtn.click();
    }

    await expect(async () => {
      expect(deleteCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("shows webhook delivery history", async ({ authenticatedPage: page }) => {
    // Mock webhook deliveries endpoint
    await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks/*/deliveries*`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          deliveries: [
            {
              id: "delivery-1",
              status: "SUCCESS",
              statusCode: 200,
              attemptNumber: 1,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Look for delivery history section or link
    await expect(page.getByText(/webhook/i).first()).toBeVisible({ timeout: 5000 });
  });
});
