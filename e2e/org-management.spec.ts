import { test, expect } from "./fixtures/auth.fixture";
import { TEST_ORG, TEST_ORG_2 } from "./fixtures/test-data";

test.describe("Org Management @high", () => {
  test("org switcher shows current org name", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    const orgSwitcher = page.getByTestId("org-switcher");
    await expect(orgSwitcher).toBeVisible({ timeout: 10000 });
    await expect(orgSwitcher).toContainText(TEST_ORG.name);
  });

  test("can switch to second org", async ({ authenticatedPage: page }) => {
    // Mock the org switch endpoint
    let switchCalled = false;
    await page.route("**/api/orgs/switch", (route) => {
      if (route.request().method() === "POST") {
        switchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            orgId: TEST_ORG_2.id,
            name: TEST_ORG_2.name,
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/dashboard");
    await page.waitForTimeout(500);

    const orgSwitcher = page.getByTestId("org-switcher");
    await expect(orgSwitcher).toBeVisible({ timeout: 10000 });
    await orgSwitcher.click();

    // Select second org from dropdown
    const secondOrg = page.getByText(TEST_ORG_2.name);
    await expect(secondOrg).toBeVisible({ timeout: 5000 });
    await secondOrg.click();

    await expect(async () => {
      expect(switchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can rename org in org settings", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route(`**/api/orgs/${TEST_ORG.id}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...TEST_ORG,
            name: "Renamed Workspace",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/settings/organization");

    const orgNameInput = page.getByTestId("org-name-input");
    await expect(orgNameInput).toBeVisible({ timeout: 10000 });
    await orgNameInput.clear();
    await orgNameInput.fill("Renamed Workspace");

    const saveBtn = page.getByTestId("org-save-btn");
    await saveBtn.click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("org settings shows current plan", async ({ authenticatedPage: page }) => {
    await page.goto("/settings/organization");

    // Should display the current plan somewhere on the page
    const planText = page.getByText(/pro/i).first();
    await expect(planText).toBeVisible({ timeout: 10000 });
  });
});
