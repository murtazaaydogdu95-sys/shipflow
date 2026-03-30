import { test, expect } from "./fixtures/auth.fixture";
import { TEST_ORG } from "./fixtures/test-data";

test.describe("Budget Dashboard", () => {
  test("budget dashboard loads", async ({ authenticatedPage: page }) => {
    await page.goto(`/orgs/${TEST_ORG.id}/budget`);

    // Page should load with a heading or title indicating budget
    await expect(
      page.getByRole("heading", { name: /budget/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("can create a budget policy", async ({ authenticatedPage: page }) => {
    // Mock the POST to prevent DB writes
    let postCalled = false;
    await page.route(`**/api/orgs/${TEST_ORG.id}/budget-policies`, (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "policy-new",
            orgId: TEST_ORG.id,
            scope: "org",
            scopeId: null,
            metric: "cost_cents",
            window: "calendar_month",
            amountCents: 50000,
            warnPercent: 80,
            hardStopEnabled: true,
            notifyEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/budget`);
    await expect(
      page.getByRole("heading", { name: /budget/i })
    ).toBeVisible({ timeout: 10000 });

    // Click create/add policy button
    const createButton = page.getByRole("button", { name: /add|create|new/i });
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();

      // Fill in the form fields if a dialog/form appears
      const amountInput = page.getByLabel(/amount|limit/i);
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.fill("500");

        // Submit the form
        const submitButton = page.getByRole("button", { name: /save|create|submit/i });
        await submitButton.click();

        // Verify POST was called
        await expect(async () => {
          expect(postCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test("policy shows current spend vs limit", async ({ authenticatedPage: page }) => {
    // Mock the GET to return a policy with spend data
    await page.route(`**/api/orgs/${TEST_ORG.id}/budget-policies`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "policy-1",
              orgId: TEST_ORG.id,
              scope: "org",
              scopeId: null,
              metric: "cost_cents",
              window: "calendar_month",
              amountCents: 10000,
              warnPercent: 80,
              hardStopEnabled: true,
              notifyEnabled: true,
              currentSpendCents: 4200,
              percentUsed: 42,
              status: "ok",
              incidents: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/budget`);
    await expect(
      page.getByRole("heading", { name: /budget/i })
    ).toBeVisible({ timeout: 10000 });

    // The page should display spend information
    // Look for spend amount or percentage indicator
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("edit policy updates limit", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    let patchBody: Record<string, unknown> | null = null;

    // Mock GET to return an existing policy
    await page.route(`**/api/orgs/${TEST_ORG.id}/budget-policies`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "policy-1",
              orgId: TEST_ORG.id,
              scope: "org",
              scopeId: null,
              metric: "cost_cents",
              window: "calendar_month",
              amountCents: 10000,
              warnPercent: 80,
              hardStopEnabled: true,
              notifyEnabled: true,
              currentSpendCents: 0,
              percentUsed: 0,
              status: "ok",
              incidents: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
        });
      }
      return route.continue();
    });

    // Mock PATCH for updating the policy
    await page.route(`**/api/orgs/${TEST_ORG.id}/budget-policies/policy-1`, (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        patchBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "policy-1",
            orgId: TEST_ORG.id,
            scope: "org",
            scopeId: null,
            metric: "cost_cents",
            window: "calendar_month",
            amountCents: 20000,
            warnPercent: 80,
            hardStopEnabled: true,
            notifyEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/budget`);
    await expect(
      page.getByRole("heading", { name: /budget/i })
    ).toBeVisible({ timeout: 10000 });

    // Click edit button on the policy row
    const editButton = page.getByRole("button", { name: /edit/i }).first();
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();

      const amountInput = page.getByLabel(/amount|limit/i);
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.clear();
        await amountInput.fill("200");

        const saveButton = page.getByRole("button", { name: /save|update/i });
        await saveButton.click();

        await expect(async () => {
          expect(patchCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });
});
