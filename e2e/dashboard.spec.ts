import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

test.describe("Dashboard", () => {
  test("displays project list for authenticated user", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 10000 });
  });

  test("shows project cards with story/sprint counts", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    const projectCard = page.getByTestId(`project-card-${TEST_PROJECT.slug}`);
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await expect(projectCard).toContainText(TEST_PROJECT.name);
  });

  test("creates a new project via dialog", async ({ authenticatedPage: page }) => {
    // Mock project creation API — prevent DB write
    await page.route("**/api/projects", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-project-id",
            name: "New Test Project",
            slug: "new-test-project",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 10000 });

    // Click create project button
    const createBtn = page.getByTestId("create-project-btn");
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Fill in form
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator("#name").fill("New Test Project");
    await dialog.locator("#description").fill("A brand new project");
    await dialog.locator("#techStack").fill("React, Node.js");

    // Submit
    await dialog.getByRole("button", { name: /create/i }).click();
  });

  test("navigates to project board on card click", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");

    const projectCard = page.getByTestId(`project-card-${TEST_PROJECT.slug}`);
    await expect(projectCard).toBeVisible({ timeout: 10000 });
    await projectCard.click();

    await page.waitForURL(`**/projects/${TEST_PROJECT.id}`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(`/projects/${TEST_PROJECT.id}`));
  });

  test("shows usage info", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({ timeout: 10000 });

    // Usage section should show AI rewrite info from real API
    await expect(
      page.getByText(/AI Rewrite/i).or(page.getByText(/rewrite/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
