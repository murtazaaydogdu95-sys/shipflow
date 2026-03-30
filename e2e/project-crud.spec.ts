import { test, expect } from "./fixtures/auth.fixture";
import { SettingsPage } from "./helpers/page-objects/settings.page";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Project CRUD @critical", () => {
  test("creates a new project from dashboard", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    await page.route("**/api/projects", (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-project-id",
            name: "New E2E Project",
            slug: "new-e2e-project",
            description: "",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/dashboard");

    const errorHeading = page.getByRole("heading", { name: /something went wrong/i });
    const projectsHeading = page.getByRole("heading", { name: "Projects" });
    const tryAgainBtn = page.getByRole("button", { name: /try again/i });

    // Wait for dashboard to load with retry on error boundary
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await Promise.race([
        projectsHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "ok" as const),
        errorHeading.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const),
      ]).catch(() => "error" as const);

      if (result === "ok") break;

      const hasTryAgain = await tryAgainBtn.isVisible().catch(() => false);
      if (hasTryAgain) {
        await tryAgainBtn.click();
        await page.waitForTimeout(1000);
      } else {
        await page.waitForTimeout(2000);
        await page.goto("/dashboard");
      }
    }

    const createBtn = page.getByTestId("create-project-btn");
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Fill project name in create dialog/form
    const nameInput = page.getByTestId("project-name-input").or(
      page.getByPlaceholder(/project name/i)
    );
    await expect(nameInput.first()).toBeVisible({ timeout: 5000 });
    await nameInput.first().fill("New E2E Project");

    // Submit creation
    const submitBtn = page.getByTestId("project-create-submit").or(
      page.getByRole("button", { name: /create/i })
    );
    await submitBtn.first().click();

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("navigates to project and sees Kanban board", async ({
    authenticatedPage: page,
  }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}`);

    const boardTab = page.getByRole("tab", { name: "Board" });
    await expect(boardTab).toBeVisible({ timeout: 10000 });
    await boardTab.click();

    // Board columns should be visible
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("board-column-TODO")).toBeVisible();
  });

  test("can edit project name in settings", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...TEST_PROJECT,
            name: "Renamed Project",
          }),
        });
      }
      return route.continue();
    });

    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);

    await settings.editProjectName("Renamed Project");
    await settings.save();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can delete project (OWNER only)", async ({ authenticatedPage: page }) => {
    let deleteCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}`, (route) => {
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

    const settings = new SettingsPage(page);
    await settings.goto(TEST_PROJECT.id);

    // Look for delete button in danger zone
    const deleteBtn = page.getByTestId("settings-delete-project").or(
      page.getByRole("button", { name: /delete project/i })
    );
    await expect(deleteBtn.first()).toBeVisible({ timeout: 10000 });
    await deleteBtn.first().click();

    // Confirm deletion in dialog
    const confirmBtn = page.getByTestId("confirm-delete-btn").or(
      page.getByRole("button", { name: /confirm/i }).or(
        page.getByRole("button", { name: /delete/i })
      )
    );
    // Wait for confirmation dialog
    await expect(confirmBtn.first()).toBeVisible({ timeout: 5000 });
    await confirmBtn.first().click();

    await expect(async () => {
      expect(deleteCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
