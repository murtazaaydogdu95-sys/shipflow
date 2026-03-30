import { test, expect } from "@playwright/test";
import { LoginPage } from "./helpers/page-objects/login.page";
import { TEST_NEW_USER } from "./fixtures/test-data";

// Onboarding tests need a fresh context (unauthenticated)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Onboarding @critical", () => {
  test("redirects to /onboarding after login when onboardingCompleted is false", async ({
    page,
  }) => {
    // Log in as the new user whose onboardingCompleted is false in the seed.
    // No session mock needed — the real backend returns the correct session.
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.fillCredentials(TEST_NEW_USER.email, TEST_NEW_USER.password);
    await loginPage.submit();

    // Should redirect to onboarding for new users
    await page.waitForURL("**/onboarding**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("displays welcome heading and workspace name input", async ({ page }) => {
    // Mock session as new user
    await page.route("**/api/auth/session", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: TEST_NEW_USER.id,
            name: TEST_NEW_USER.name,
            email: TEST_NEW_USER.email,
            onboardingCompleted: false,
            orgId: "new-org-id",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.goto("/onboarding");

    // Should show a welcome heading
    await expect(
      page.getByRole("heading", { name: /welcome/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show workspace name input
    await expect(page.getByTestId("onboarding-workspace-name")).toBeVisible();
  });

  test("can rename workspace and continue to project step", async ({ page }) => {
    // Mock session as new user
    await page.route("**/api/auth/session", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: TEST_NEW_USER.id,
            name: TEST_NEW_USER.name,
            email: TEST_NEW_USER.email,
            onboardingCompleted: false,
            orgId: "new-org-id",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    // Mock PATCH to rename org
    let patchCalled = false;
    await page.route("**/api/orgs/*", (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-org-id",
            name: "My Custom Workspace",
            slug: "my-custom-workspace",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/onboarding");
    await page.getByTestId("onboarding-workspace-name").waitFor({ state: "visible", timeout: 10000 });

    await page.getByTestId("onboarding-workspace-name").clear();
    await page.getByTestId("onboarding-workspace-name").fill("My Custom Workspace");
    await page.getByTestId("onboarding-continue").click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can skip project creation", async ({ page }) => {
    // Mock session as new user
    await page.route("**/api/auth/session", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: TEST_NEW_USER.id,
            name: TEST_NEW_USER.name,
            email: TEST_NEW_USER.email,
            onboardingCompleted: false,
            orgId: "new-org-id",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    // Mock PATCH for org rename (workspace step)
    await page.route("**/api/orgs/*", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "new-org-id", name: "Test Workspace" }),
        });
      }
      return route.continue();
    });

    await page.goto("/onboarding");
    await page.getByTestId("onboarding-workspace-name").waitFor({ state: "visible", timeout: 10000 });

    // Continue past workspace step
    await page.getByTestId("onboarding-continue").click();

    // Skip project creation
    const skipBtn = page.getByTestId("onboarding-skip");
    await expect(skipBtn).toBeVisible({ timeout: 5000 });
    await skipBtn.click();
  });

  test("completes full onboarding and redirects to dashboard", async ({ page }) => {
    // Mock session as new user
    await page.route("**/api/auth/session", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: TEST_NEW_USER.id,
            name: TEST_NEW_USER.name,
            email: TEST_NEW_USER.email,
            onboardingCompleted: false,
            orgId: "new-org-id",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    // Mock PATCH for org rename
    await page.route("**/api/orgs/*", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "new-org-id", name: "My Workspace" }),
        });
      }
      return route.continue();
    });

    // Mock POST for project creation
    await page.route("**/api/projects", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-project-id",
            name: "My First Project",
            slug: "my-first-project",
          }),
        });
      }
      return route.continue();
    });

    // Mock PATCH for onboarding completion
    await page.route("**/api/account/onboarding", (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ onboardingCompleted: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/onboarding");
    await page.getByTestId("onboarding-workspace-name").waitFor({ state: "visible", timeout: 10000 });

    // Step 1: Workspace name
    await page.getByTestId("onboarding-continue").click();

    // Step 2: Complete onboarding
    const completeBtn = page.getByTestId("onboarding-complete");
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
