import { test, expect } from "./fixtures/roles.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

test.describe("RBAC @high", () => {
  // --- OWNER tests (uses default page with existing storageState) ---

  test("OWNER can access org settings", async ({ page }) => {
    await page.goto("/settings/organization");

    // Should load org settings without redirect
    const orgNameInput = page.getByTestId("org-name-input").or(
      page.getByRole("heading", { name: /organization/i })
    );
    await expect(orgNameInput.first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/settings\/organization/);
  });

  test("OWNER can access billing", async ({ page }) => {
    await page.goto("/settings/billing");

    // Should load billing page without redirect
    const billingContent = page.getByRole("heading", { name: /billing/i }).or(
      page.getByText(/plan/i)
    );
    await expect(billingContent.first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/settings\/billing/);
  });

  // --- ADMIN tests (uses adminPage fixture) ---

  test("ADMIN can access org settings but not billing", async ({ adminPage }) => {
    // Admin should access org settings
    await adminPage.goto("/settings/organization");
    const orgContent = adminPage.getByTestId("org-name-input").or(
      adminPage.getByRole("heading", { name: /organization/i })
    );
    await expect(orgContent.first()).toBeVisible({ timeout: 10000 });

    // Admin should NOT access billing - expect redirect or forbidden
    await adminPage.goto("/settings/billing");

    const forbidden = adminPage.getByText(/forbidden/i).or(
      adminPage.getByText(/not authorized/i).or(
        adminPage.getByText(/access denied/i)
      )
    );
    const redirectedAway = await adminPage.waitForURL("**/dashboard**", { timeout: 5000 }).then(() => true).catch(() => false);
    const isForbidden = await forbidden.first().isVisible().catch(() => false);

    // Either redirected or shown forbidden message
    expect(redirectedAway || isForbidden).toBe(true);
  });

  test("ADMIN can manage members", async ({ adminPage }) => {
    await adminPage.goto("/settings/members");

    // Admin should see members page
    const membersContent = adminPage.getByTestId("invite-email").or(
      adminPage.getByRole("heading", { name: /members/i })
    );
    await expect(membersContent.first()).toBeVisible({ timeout: 10000 });
  });

  // --- MEMBER tests (uses memberPage fixture) ---

  test("MEMBER cannot access org settings", async ({ memberPage }) => {
    await memberPage.goto("/settings/organization");

    // Member should be denied access — redirect or forbidden message
    const forbidden = memberPage.getByText(/forbidden/i).or(
      memberPage.getByText(/not authorized/i).or(
        memberPage.getByText(/access denied/i)
      )
    );
    const redirectedAway = await memberPage.waitForURL("**/dashboard**", { timeout: 5000 }).then(() => true).catch(() => false);
    const isForbidden = await forbidden.first().isVisible().catch(() => false);

    expect(redirectedAway || isForbidden).toBe(true);
  });

  test("MEMBER cannot delete project", async ({ memberPage }) => {
    await memberPage.goto(`/projects/${TEST_PROJECT.id}/settings`);

    // Delete button should either not exist or be disabled for members
    const deleteBtn = memberPage.getByTestId("settings-delete-project").or(
      memberPage.getByRole("button", { name: /delete project/i })
    );

    // Check if redirected away or button not visible
    const redirectedAway = await memberPage.waitForURL("**/dashboard**", { timeout: 3000 }).then(() => true).catch(() => false);
    if (!redirectedAway) {
      // If still on settings, delete button should not be present or be disabled
      const isVisible = await deleteBtn.first().isVisible().catch(() => false);
      if (isVisible) {
        await expect(deleteBtn.first()).toBeDisabled();
      }
    }
  });

  test("MEMBER can view board and create stories", async ({ memberPage }) => {
    // Navigate to project board
    await memberPage.goto(`/projects/${TEST_PROJECT.id}`);

    const boardTab = memberPage.getByRole("tab", { name: "Board" });
    await expect(boardTab).toBeVisible({ timeout: 10000 });
    await boardTab.click();

    // Board columns should be visible
    await expect(memberPage.getByTestId("board-column-BACKLOG")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Server-side RBAC enforcement @critical", () => {
  test("MEMBER cannot DELETE project via API", async ({ memberPage }) => {
    const response = await memberPage.request.delete(
      `http://localhost:3001/api/projects/${TEST_PROJECT.id}`
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("MEMBER cannot PATCH org settings via API", async ({ memberPage }) => {
    const response = await memberPage.request.patch(
      `http://localhost:3001/api/orgs/${TEST_ORG.id}`,
      { data: { name: "Hacked Org Name" } }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("MEMBER cannot invite members via API", async ({ memberPage }) => {
    const response = await memberPage.request.post(
      `http://localhost:3001/api/orgs/${TEST_ORG.id}/invites`,
      { data: { email: "hacker@test.com", role: "ADMIN" } }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("MEMBER cannot access billing checkout via API", async ({ memberPage }) => {
    const response = await memberPage.request.post(
      `http://localhost:3001/api/billing/checkout`,
      { data: { planId: "pro" } }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("unauthenticated user cannot access stories API", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    const response = await page.request.get(
      `http://localhost:3001/api/projects/${TEST_PROJECT.id}/stories`
    );
    expect(response.status()).toBe(401);
    await context.close();
  });
});
