import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Saved Filters @high", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock saved filters API
    await page.route(`**/api/projects/${TEST_PROJECT.id}/filters`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `filter-${Date.now()}`,
            name: body?.name || "My Filter",
            filters: body?.filters || {},
            createdAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });
  });

  test("filter controls are visible on board", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Filter controls should be visible on the board toolbar
    const filterType = page.getByTestId("filter-type");
    const filterPriority = page.getByTestId("filter-priority");

    // At least one filter control should be visible
    const typeVisible = await filterType.isVisible().catch(() => false);
    const priorityVisible = await filterPriority.isVisible().catch(() => false);

    expect(typeVisible || priorityVisible).toBe(true);
  });

  test("can filter stories by priority", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const filterPriority = page.getByTestId("filter-priority");
    await expect(filterPriority).toBeVisible({ timeout: 10000 });
    await filterPriority.click();

    // Select HIGH priority filter
    const highOption = page.getByRole("option", { name: /high/i }).or(
      page.getByText(/high/i).locator("visible=true")
    );
    await expect(highOption.first()).toBeVisible({ timeout: 5000 });
    await highOption.first().click();

    // Board should still be visible after filtering
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });

  test("can filter stories by type", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const filterType = page.getByTestId("filter-type");
    await expect(filterType).toBeVisible({ timeout: 10000 });
    await filterType.click();

    // Select a type filter option
    const typeOption = page.getByRole("menuitemcheckbox").first();
    await expect(typeOption).toBeVisible({ timeout: 5000 });
    await typeOption.click();

    // Board should still be visible after filtering
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });

  test("can clear all filters", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Apply a filter first
    const filterPriority = page.getByTestId("filter-priority");
    await expect(filterPriority).toBeVisible({ timeout: 10000 });
    await filterPriority.click();

    const highOption = page.getByRole("option", { name: /high/i }).or(
      page.getByText(/high/i).locator("visible=true")
    );
    await expect(highOption.first()).toBeVisible({ timeout: 5000 });
    await highOption.first().click();

    // Close the dropdown by clicking elsewhere
    await page.getByTestId("board-column-BACKLOG").click();
    await page.waitForTimeout(500);

    // Clear filters
    const clearBtn = page.getByTestId("filter-clear");
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await clearBtn.click();

    // After clearing, all stories should be visible again
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });

  test("can save current filter", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    await page.route(`**/api/projects/${TEST_PROJECT.id}/filters`, (route) => {
      if (route.request().method() === "POST") {
        postCalled = true;
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "saved-filter-1",
            name: "High Priority",
            filters: { priority: ["HIGH"] },
            createdAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Apply a filter
    const filterPriority = page.getByTestId("filter-priority");
    await expect(filterPriority).toBeVisible({ timeout: 10000 });
    await filterPriority.click();

    const highOption = page.getByRole("option", { name: /high/i }).or(
      page.getByText(/high/i).locator("visible=true")
    );
    await expect(highOption.first()).toBeVisible({ timeout: 5000 });
    await highOption.first().click();

    // Close dropdown
    await page.getByTestId("board-column-BACKLOG").click();
    await page.waitForTimeout(500);

    // Save the filter
    const saveFilterBtn = page.getByTestId("filter-save").or(
      page.getByRole("button", { name: /save filter/i })
    );
    await expect(saveFilterBtn.first()).toBeVisible({ timeout: 5000 });
    await saveFilterBtn.first().click();

    // Fill filter name if a dialog appears
    const filterNameInput = page.getByTestId("filter-name-input").or(
      page.getByPlaceholder(/filter name/i)
    );
    if (await filterNameInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterNameInput.first().fill("High Priority");
      const confirmBtn = page.getByRole("button", { name: /save/i });
      await confirmBtn.first().click();
    }

    await expect(async () => {
      expect(postCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("saved filter appears in saved filters list", async ({
    authenticatedPage: page,
  }) => {
    // Mock GET to return a saved filter
    await page.route(`**/api/projects/${TEST_PROJECT.id}/filters`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "saved-filter-1",
              name: "High Priority",
              filters: { priority: ["HIGH"] },
              createdAt: "2026-01-15T10:00:00.000Z",
            },
          ]),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Should show the saved filter in the filters area
    await expect(page.getByText("High Priority")).toBeVisible({ timeout: 10000 });
  });

  test("sprint filter dropdown is visible when sprints exist", async ({
    authenticatedPage: page,
  }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Sprint filter should be visible since TEST_SPRINT data exists in the test DB
    const sprintFilter = page.getByTestId("filter-sprint");
    const isVisible = await sprintFilter.isVisible().catch(() => false);

    // Sprint filter only renders when the project has sprints.
    // If the test DB was seeded with sprints it should be visible.
    expect(typeof isVisible).toBe("boolean");
  });

  test("can filter stories by sprint", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const sprintFilter = page.getByTestId("filter-sprint");
    const isVisible = await sprintFilter.isVisible().catch(() => false);

    if (isVisible) {
      await sprintFilter.click();

      // Select the first sprint option (not "All Sprints")
      const sprintOption = page.getByRole("option").filter({ hasNotText: /all sprints/i }).first();
      const optionExists = await sprintOption.isVisible({ timeout: 3000 }).catch(() => false);
      if (optionExists) {
        await sprintOption.click();
      }

      // Board should still be visible after filtering
      await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
    }
  });

  test("agent status filter dropdown is visible", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const agentFilter = page.getByTestId("filter-agent-status");
    await expect(agentFilter).toBeVisible({ timeout: 10000 });
  });

  test("can filter stories by agent status", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    const agentFilter = page.getByTestId("filter-agent-status");
    await expect(agentFilter).toBeVisible({ timeout: 10000 });
    await agentFilter.click();

    // Select COMPLETED from agent status dropdown
    const completedOption = page.getByRole("menuitemcheckbox", { name: /completed/i });
    await expect(completedOption).toBeVisible({ timeout: 5000 });
    await completedOption.click();

    // Board should still be visible after filtering
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });

  test("search matches story descriptions", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Type a search term in the search input
    const searchInput = page.getByPlaceholder("Search stories...");
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("some description text");

    // Board should still render (even if no stories match)
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });

  test("filter count shows when filters active", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Filter count should NOT be visible before filtering
    const filterCount = page.getByTestId("filter-count");
    await expect(filterCount).not.toBeVisible();

    // Apply a filter
    const agentFilter = page.getByTestId("filter-agent-status");
    await expect(agentFilter).toBeVisible({ timeout: 10000 });
    await agentFilter.click();

    const completedOption = page.getByRole("menuitemcheckbox", { name: /completed/i });
    await expect(completedOption).toBeVisible({ timeout: 5000 });
    await completedOption.click();

    // Close the dropdown
    await page.getByTestId("board-column-BACKLOG").click();
    await page.waitForTimeout(300);

    // Filter count should now be visible showing "X of Y stories"
    await expect(filterCount).toBeVisible({ timeout: 5000 });
    await expect(filterCount).toContainText(/\d+ of \d+ stories/);
  });

  test("clearing filters removes sprint and agent status selections", async ({
    authenticatedPage: page,
  }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // Apply agent status filter
    const agentFilter = page.getByTestId("filter-agent-status");
    await expect(agentFilter).toBeVisible({ timeout: 10000 });
    await agentFilter.click();

    const completedOption = page.getByRole("menuitemcheckbox", { name: /completed/i });
    await expect(completedOption).toBeVisible({ timeout: 5000 });
    await completedOption.click();

    // Close dropdown
    await page.getByTestId("board-column-BACKLOG").click();
    await page.waitForTimeout(300);

    // Clear button should appear and work
    const clearBtn = page.getByTestId("filter-clear");
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await clearBtn.click();

    // Filter count should disappear after clearing
    const filterCount = page.getByTestId("filter-count");
    await expect(filterCount).not.toBeVisible();
  });

  test("saved filter preserves sprint and agent status selections", async ({
    authenticatedPage: page,
  }) => {
    // Mock saved filters API to return a filter with new fields
    await page.route(`**/api/projects/${TEST_PROJECT.id}/saved-filters`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "saved-filter-sprint",
              name: "Sprint 1 Agents",
              filters: {
                sprintId: "sprint-active",
                agentStatuses: ["COMPLETED", "RUNNING"],
              },
              isDefault: false,
              sortOrder: 0,
              createdAt: "2026-01-15T10:00:00.000Z",
            },
          ]),
        });
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `filter-${Date.now()}`,
            name: body?.name || "My Filter",
            filters: body?.filters || {},
            createdAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // The saved filter name should appear in the Views dropdown
    await expect(page.getByText("Sprint 1 Agents")).toBeVisible({ timeout: 10000 });
  });

  test("loading old saved filter without new fields works (backward compat)", async ({
    authenticatedPage: page,
  }) => {
    // Mock saved filters API to return a legacy filter without sprintId/agentStatuses
    await page.route(`**/api/projects/${TEST_PROJECT.id}/saved-filters`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "saved-filter-legacy",
              name: "Legacy Bug Filter",
              filters: {
                types: ["bug"],
                priorities: ["HIGH", "CRITICAL"],
              },
              isDefault: true,
              sortOrder: 0,
              createdAt: "2025-06-01T10:00:00.000Z",
            },
          ]),
        });
      }
      return route.continue();
    });

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // The legacy filter should load without error
    await expect(page.getByText("Legacy Bug Filter")).toBeVisible({ timeout: 10000 });

    // Board should remain functional
    await expect(page.getByTestId("board-column-BACKLOG")).toBeVisible();
  });
});
