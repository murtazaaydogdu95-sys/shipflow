import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_SPRINT } from "./fixtures/test-data";

test.describe("Burndown Charts", () => {
  test("analytics page shows tabbed layout", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);

    // Both tabs should be visible
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Burndown" })).toBeVisible();
  });

  test("Overview tab is selected by default", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);

    const overviewTab = page.getByRole("tab", { name: "Overview" });
    await expect(overviewTab).toHaveAttribute("data-state", "active");

    const burndownTab = page.getByRole("tab", { name: "Burndown" });
    await expect(burndownTab).not.toHaveAttribute("data-state", "active");
  });

  test("Burndown tab shows sprint selector", async ({ authenticatedPage: page }) => {
    // Mock the sprints API to return sprints with dates
    await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: TEST_SPRINT.active.id,
            name: TEST_SPRINT.active.name,
            status: "ACTIVE",
            startDate: "2026-01-10T00:00:00.000Z",
            endDate: "2026-01-20T00:00:00.000Z",
          },
          {
            id: TEST_SPRINT.planning.id,
            name: TEST_SPRINT.planning.name,
            status: "PLANNING",
            startDate: "2026-01-21T00:00:00.000Z",
            endDate: "2026-01-31T00:00:00.000Z",
          },
        ]),
      });
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);
    await page.getByTestId("analytics-burndown-tab").click();

    await expect(page.getByTestId("burndown-sprint-select")).toBeVisible();
  });

  test("selecting a sprint shows burndown chart", async ({ authenticatedPage: page }) => {
    // Mock sprints
    await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: TEST_SPRINT.active.id,
            name: TEST_SPRINT.active.name,
            status: "ACTIVE",
            startDate: "2026-01-10T00:00:00.000Z",
            endDate: "2026-01-20T00:00:00.000Z",
          },
        ]),
      });
    });

    // Mock burndown API
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/sprints/${TEST_SPRINT.active.id}/burndown`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sprint: {
              id: TEST_SPRINT.active.id,
              name: TEST_SPRINT.active.name,
              startDate: "2026-01-10T00:00:00.000Z",
              endDate: "2026-01-20T00:00:00.000Z",
              totalPoints: 20,
            },
            dataPoints: [
              { date: "2026-01-10", idealRemaining: 20, actualRemaining: 20 },
              { date: "2026-01-11", idealRemaining: 18, actualRemaining: 18 },
              { date: "2026-01-12", idealRemaining: 16, actualRemaining: 15 },
              { date: "2026-01-13", idealRemaining: 14, actualRemaining: 12 },
              { date: "2026-01-14", idealRemaining: 12, actualRemaining: null },
            ],
            summary: {
              totalPoints: 20,
              completedPoints: 8,
              remainingPoints: 12,
              daysTotal: 10,
              daysElapsed: 4,
              daysRemaining: 6,
            },
          }),
        });
      }
    );

    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);
    await page.getByTestId("analytics-burndown-tab").click();

    // Chart should appear (auto-selects active sprint)
    await expect(page.getByTestId("burndown-chart")).toBeVisible({ timeout: 10000 });
  });

  test("burndown chart shows summary stats", async ({ authenticatedPage: page }) => {
    // Mock sprints
    await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: TEST_SPRINT.active.id,
            name: TEST_SPRINT.active.name,
            status: "ACTIVE",
            startDate: "2026-01-10T00:00:00.000Z",
            endDate: "2026-01-20T00:00:00.000Z",
          },
        ]),
      });
    });

    // Mock burndown
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/sprints/${TEST_SPRINT.active.id}/burndown`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sprint: {
              id: TEST_SPRINT.active.id,
              name: TEST_SPRINT.active.name,
              startDate: "2026-01-10T00:00:00.000Z",
              endDate: "2026-01-20T00:00:00.000Z",
              totalPoints: 20,
            },
            dataPoints: [
              { date: "2026-01-10", idealRemaining: 20, actualRemaining: 20 },
            ],
            summary: {
              totalPoints: 20,
              completedPoints: 8,
              remainingPoints: 12,
              daysTotal: 10,
              daysElapsed: 4,
              daysRemaining: 6,
            },
          }),
        });
      }
    );

    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);
    await page.getByTestId("analytics-burndown-tab").click();

    const summarySection = page.getByTestId("burndown-summary");
    await expect(summarySection).toBeVisible({ timeout: 10000 });

    // Check summary card values
    await expect(summarySection).toContainText("20"); // Total Points
    await expect(summarySection).toContainText("8"); // Completed
    await expect(summarySection).toContainText("12"); // Remaining
    await expect(summarySection).toContainText("6"); // Days Left
  });

  test("sprint with no stories shows empty state", async ({ authenticatedPage: page }) => {
    // Mock sprints
    await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: TEST_SPRINT.active.id,
            name: TEST_SPRINT.active.name,
            status: "ACTIVE",
            startDate: "2026-01-10T00:00:00.000Z",
            endDate: "2026-01-20T00:00:00.000Z",
          },
        ]),
      });
    });

    // Mock burndown with 0 total points (no stories)
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/sprints/${TEST_SPRINT.active.id}/burndown`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            sprint: {
              id: TEST_SPRINT.active.id,
              name: TEST_SPRINT.active.name,
              startDate: "2026-01-10T00:00:00.000Z",
              endDate: "2026-01-20T00:00:00.000Z",
              totalPoints: 0,
            },
            dataPoints: [],
            summary: {
              totalPoints: 0,
              completedPoints: 0,
              remainingPoints: 0,
              daysTotal: 10,
              daysElapsed: 4,
              daysRemaining: 6,
            },
          }),
        });
      }
    );

    await page.goto(`/projects/${TEST_PROJECT.id}/analytics`);
    await page.getByTestId("analytics-burndown-tab").click();

    // Should show empty state message instead of chart
    await expect(
      page.getByText("No story points assigned in this sprint")
    ).toBeVisible({ timeout: 10000 });
  });
});
