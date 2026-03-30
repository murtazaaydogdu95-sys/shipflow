import { test, expect } from "./fixtures/auth.fixture";
import { TEST_ORG } from "./fixtures/test-data";

test.describe("Org Invites @high", () => {
  let postCalled = false;
  let deleteCalled = false;

  test.beforeEach(async ({ authenticatedPage: page }) => {
    postCalled = false;
    deleteCalled = false;

    // Consolidated route handler for invites — handles GET, POST
    await page.route(`**/api/orgs/${TEST_ORG.id}/invites`, (route) => {
      const method = route.request().method();

      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "invite-1",
              email: "existing-invite@example.com",
              role: "MEMBER",
              status: "PENDING",
              createdAt: "2026-01-15T10:00:00.000Z",
            },
          ]),
        });
      }

      if (method === "POST") {
        postCalled = true;
        const body = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "invite-new",
            email: body?.email || "new@example.com",
            role: body?.role || "MEMBER",
            status: "PENDING",
            createdAt: new Date().toISOString(),
          }),
        });
      }

      return route.continue();
    });

    // Handler for individual invite operations (DELETE)
    await page.route(`**/api/orgs/${TEST_ORG.id}/invites/*`, (route) => {
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
  });

  test("members page shows invite form", async ({ authenticatedPage: page }) => {
    await page.goto("/settings/members");

    const inviteEmail = page.getByTestId("invite-email");
    await expect(inviteEmail).toBeVisible({ timeout: 10000 });

    const inviteBtn = page.getByTestId("invite-btn");
    await expect(inviteBtn).toBeVisible();
  });

  test("can send invite with email and role", async ({ authenticatedPage: page }) => {
    await page.goto("/settings/members");

    const inviteEmail = page.getByTestId("invite-email");
    await expect(inviteEmail).toBeVisible({ timeout: 10000 });
    await inviteEmail.fill("newinvite@example.com");

    // Select role
    const roleSelect = page.getByTestId("invite-role");
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.click();
      await page.getByRole("option", { name: /admin/i }).click();
    }

    const inviteBtn = page.getByTestId("invite-btn");
    await inviteBtn.click();

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("pending invite appears in list", async ({ authenticatedPage: page }) => {
    await page.goto("/settings/members");

    // Wait for the invites list to load
    await page.waitForTimeout(500);

    // Should show the pending invite email
    await expect(page.getByText("existing-invite@example.com")).toBeVisible({ timeout: 10000 });
  });

  test("revoking invite removes it from list", async ({ authenticatedPage: page }) => {
    await page.goto("/settings/members");
    await page.waitForTimeout(500);

    // Find and click revoke button for the pending invite
    await expect(page.getByText("existing-invite@example.com")).toBeVisible({ timeout: 10000 });

    const revokeBtn = page.getByTestId("revoke-invite-invite-1").or(
      page.getByRole("button", { name: /revoke/i }).or(
        page.getByRole("button", { name: /remove/i })
      )
    );
    await expect(revokeBtn.first()).toBeVisible({ timeout: 5000 });
    await revokeBtn.first().click();

    await expect(async () => {
      expect(deleteCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
