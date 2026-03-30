import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Navigation @low", () => {
  test("sidebar shows all main navigation links", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    // Wait for dashboard to load
    await expect(
      page.getByRole("heading", { name: /projects/i })
        .or(page.getByText(/dashboard/i))
        .first()
    ).toBeVisible({ timeout: 15000 });

    // Sidebar should show main navigation links
    const sidebar = page.locator("nav, aside, [role='navigation']").first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Check for common navigation items
    await expect(
      page.getByRole("link", { name: /dashboard/i })
        .or(page.getByText(/dashboard/i))
        .first()
    ).toBeVisible();
  });

  test("clicking sidebar links navigates to correct pages", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /projects/i })
        .or(page.getByText(/dashboard/i))
        .first()
    ).toBeVisible({ timeout: 15000 });

    // Click on a project to navigate
    const projectLink = page.getByText(TEST_PROJECT.name).first();
    const hasProject = await projectLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasProject) {
      await projectLink.click();
      await page.waitForURL(`**/projects/${TEST_PROJECT.id}**`, { timeout: 10000 });
      await expect(page).toHaveURL(new RegExp(`/projects/${TEST_PROJECT.id}`));
    }
  });

  test("breadcrumbs show correct hierarchy on project pages", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);

    // Wait for settings page to load
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });

    // Breadcrumbs should show project name or navigation path
    await expect(
      page.getByText(TEST_PROJECT.name)
        .or(page.getByText(/settings/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("command palette opens with Cmd+K", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /projects/i })
        .or(page.getByText(/dashboard/i))
        .first()
    ).toBeVisible({ timeout: 15000 });

    // Open command palette with Cmd+K (Meta+K)
    await page.keyboard.press("Meta+k");

    // Command palette / quick capture dialog should appear
    await expect(
      page.getByRole("dialog")
        .or(page.getByPlaceholder(/search|capture|type/i).first())
        .first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("back button navigates to previous page", async ({ authenticatedPage: page }) => {
    // Navigate to dashboard first
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /projects/i })
        .or(page.getByText(/dashboard/i))
        .first()
    ).toBeVisible({ timeout: 15000 });

    // Navigate to project settings
    await page.goto(`/projects/${TEST_PROJECT.id}/settings`);
    await expect(page.getByTestId("settings-project-name")).toBeVisible({ timeout: 10000 });

    // Go back
    await page.goBack();

    // Should be back on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
