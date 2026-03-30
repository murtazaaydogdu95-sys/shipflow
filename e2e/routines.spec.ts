import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

const MOCK_ROUTINES = [
  {
    id: "routine-1",
    name: "Daily Standup Review",
    cronExpression: "0 9 * * 1-5",
    timezone: "UTC",
    concurrencyPolicy: "skip_if_active",
    active: true,
    webhookEnabled: false,
    webhookAuthType: null,
    webhookSecret: null,
    nextTriggerAt: "2026-03-31T09:00:00.000Z",
    lastTriggeredAt: "2026-03-30T09:00:00.000Z",
    storyTemplate: { title: "Daily standup review", type: "chore", priority: "MEDIUM" },
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-30T09:00:00.000Z",
    _count: { runs: 25 },
  },
  {
    id: "routine-2",
    name: "Weekly Security Scan",
    cronExpression: "0 2 * * 0",
    timezone: "America/New_York",
    concurrencyPolicy: "coalesce_if_active",
    active: true,
    webhookEnabled: true,
    webhookAuthType: "hmac",
    webhookSecret: "wh-secret-123",
    nextTriggerAt: "2026-04-06T06:00:00.000Z",
    lastTriggeredAt: "2026-03-30T06:00:00.000Z",
    storyTemplate: { title: "Weekly security scan", type: "chore", priority: "HIGH" },
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-03-30T06:00:00.000Z",
    _count: { runs: 8 },
  },
];

const MOCK_ROUTINE_RUNS = [
  {
    id: "run-1",
    routineId: "routine-1",
    source: "scheduled",
    status: "completed",
    storyId: "story-abc",
    skipReason: null,
    createdAt: "2026-03-30T09:00:00.000Z",
  },
  {
    id: "run-2",
    routineId: "routine-1",
    source: "on_demand",
    status: "completed",
    storyId: "story-def",
    skipReason: null,
    createdAt: "2026-03-29T15:30:00.000Z",
  },
  {
    id: "run-3",
    routineId: "routine-1",
    source: "scheduled",
    status: "skipped",
    storyId: null,
    skipReason: "Active run exists (run-prev)",
    createdAt: "2026-03-29T09:00:00.000Z",
  },
];

function setupRoutineListRoute(page: import("@playwright/test").Page, routines = MOCK_ROUTINES) {
  return page.route(`**/api/projects/${TEST_PROJECT.id}/routines`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(routines),
      });
    }
    if (route.request().method() === "POST") {
      const newRoutine = {
        id: "routine-new",
        name: "New Routine",
        cronExpression: "0 12 * * *",
        timezone: "UTC",
        concurrencyPolicy: "always_enqueue",
        active: true,
        webhookEnabled: false,
        nextTriggerAt: "2026-03-31T12:00:00.000Z",
        lastTriggeredAt: null,
        _count: { runs: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newRoutine),
      });
    }
    return route.continue();
  });
}

function setupRoutineDetailRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/projects/${TEST_PROJECT.id}/routines/routine-1`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_ROUTINES[0], runs: MOCK_ROUTINE_RUNS }),
      });
    }
    return route.continue();
  });
}

function setupTriggerRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/projects/${TEST_PROJECT.id}/routines/*/trigger`, (route) => {
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ runId: "run-new", storyId: "story-new", skipped: false }),
    });
  });
}

test.describe("Routines Page", () => {
  test("routine list page loads", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // Should show routine list
    await expect(page.getByTestId("routine-list")).toBeVisible({ timeout: 5000 });

    // Should display both routines
    await expect(page.getByText("Daily Standup Review")).toBeVisible();
    await expect(page.getByText("Weekly Security Scan")).toBeVisible();
  });

  test("can create a routine with cron expression", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // Click create button
    const createBtn = page.getByTestId("create-routine-btn");
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Fill in form
    await page.getByTestId("routine-name-input").fill("New Routine");
    await page.getByTestId("routine-cron-input").fill("0 12 * * *");

    // Submit
    await page.getByTestId("routine-save-btn").click();

    // Should show success (toast or new row)
    await expect(page.getByText("New Routine")).toBeVisible({ timeout: 5000 });
  });

  test("routine row shows next trigger time", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // The first routine should display its next trigger time
    const routineRow = page.getByTestId("routine-row-routine-1");
    await expect(routineRow).toBeVisible({ timeout: 5000 });

    // Should contain a date/time indicator for next trigger
    await expect(routineRow.getByTestId("next-trigger-time")).toBeVisible();
  });

  test("run now button triggers routine", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);
    await setupTriggerRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // Find and click Run Now button
    const runNowBtn = page.getByTestId("routine-run-now-routine-1");
    await expect(runNowBtn).toBeVisible({ timeout: 5000 });
    await runNowBtn.click();

    // Should show confirmation or success feedback
    await expect(
      page.getByText(/triggered|created|queued/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("webhook toggle shows secret field", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // Open create/edit dialog
    const createBtn = page.getByTestId("create-routine-btn");
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Enable webhook toggle
    const webhookToggle = page.getByTestId("routine-webhook-toggle");
    await expect(webhookToggle).toBeVisible({ timeout: 5000 });
    await webhookToggle.click();

    // Secret field should now be visible
    await expect(page.getByTestId("routine-webhook-secret")).toBeVisible({ timeout: 3000 });
  });

  test("empty state shown when no routines", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page, []);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    await expect(page.getByText(/no routines/i)).toBeVisible({ timeout: 5000 });
  });

  test("routine detail shows run history", async ({ authenticatedPage: page }) => {
    await setupRoutineListRoute(page);
    await setupRoutineDetailRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/routines`);

    // Click on routine name to view details
    await page.getByText("Daily Standup Review").click();

    // Should show run history
    await expect(page.getByTestId("routine-run-history")).toBeVisible({ timeout: 5000 });
  });
});
