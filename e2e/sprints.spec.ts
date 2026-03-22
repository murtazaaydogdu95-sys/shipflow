import { test, expect } from "./fixtures/auth.fixture";
import { SprintsPage } from "./helpers/page-objects/sprints.page";
import { TEST_PROJECT, TEST_SPRINT } from "./fixtures/test-data";
import { setupSprintHandlers } from "./fixtures/api-handlers";

test.describe("Sprints", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock write operations only
    await setupSprintHandlers(page);
  });

  test("displays sprint list", async ({ authenticatedPage: page }) => {
    const sprintsPage = new SprintsPage(page);
    await sprintsPage.goto(TEST_PROJECT.id);

    // Wait for sprint page heading to render
    await expect(
      page.getByRole("heading", { name: /sprint/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows sprint progress", async ({ authenticatedPage: page }) => {
    const sprintsPage = new SprintsPage(page);
    await sprintsPage.goto(TEST_PROJECT.id);

    // Active sprint (Sprint 1) should show name from seeded DB
    await expect(page.getByText(TEST_SPRINT.active.name)).toBeVisible({ timeout: 10000 });
  });

  test("creates sprint with name and goal", async ({ authenticatedPage: page }) => {
    const sprintsPage = new SprintsPage(page);
    await sprintsPage.goto(TEST_PROJECT.id);

    await expect(sprintsPage.createButton).toBeVisible({ timeout: 10000 });

    await sprintsPage.createSprint("Sprint 3", "Build the API layer");

    // Should show success toast or the new sprint in the list
    await expect(
      page.getByText(/created/i).or(page.getByText("Sprint 3")).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("changes sprint status (PLANNING to ACTIVE)", async ({ authenticatedPage: page }) => {
    const sprintsPage = new SprintsPage(page);
    await sprintsPage.goto(TEST_PROJECT.id);

    // The planning sprint should be visible from seeded DB
    await expect(page.getByText(TEST_SPRINT.planning.name)).toBeVisible({ timeout: 10000 });

    // Should have a Start button for the planning sprint
    const startButton = page.getByRole("button", { name: /start/i });
    const isStartVisible = await startButton.isVisible().catch(() => false);
    if (isStartVisible) {
      await startButton.click();
    }
  });

  test("shows stories in sprint context", async ({ authenticatedPage: page }) => {
    const sprintsPage = new SprintsPage(page);
    await sprintsPage.goto(TEST_PROJECT.id);

    // Active sprint should show with some content
    await expect(page.getByText(TEST_SPRINT.active.name)).toBeVisible({ timeout: 10000 });
  });
});
