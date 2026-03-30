import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

const MOCK_AGENTS = [
  {
    id: "agent-1",
    name: "Frontend Coder",
    role: "coder",
    title: "Senior React Developer",
    status: "idle",
    adapterType: "claude",
    capabilities: "React, TypeScript, CSS",
    storiesCompleted: 12,
    totalCostCents: 350,
    lastHeartbeatAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { assignedStories: 3, costEvents: 5 },
  },
  {
    id: "agent-2",
    name: "QA Tester",
    role: "qa",
    title: null,
    status: "paused",
    adapterType: "claude",
    capabilities: null,
    storiesCompleted: 5,
    totalCostCents: 100,
    lastHeartbeatAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { assignedStories: 1, costEvents: 2 },
  },
];

const MOCK_AGENT_DETAIL = {
  ...MOCK_AGENTS[0],
  pauseReason: null,
  assignedStories: [
    { id: "s1", shortId: "SF-010", title: "Build login page", status: "IN_PROGRESS", identifier: "CP-010" },
  ],
  subordinates: [],
  reportingAgent: null,
  costSummary: {
    totalCostCents: 350,
    totalInputTokens: 50000,
    totalOutputTokens: 10000,
    eventCount: 5,
  },
};

function setupAgentListRoute(page: import("@playwright/test").Page, agents: unknown[] = MOCK_AGENTS) {
  return page.route(`**/api/orgs/${TEST_ORG.id}/agents`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agents),
      });
    }
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "agent-new",
          name: "New Agent",
          role: "coder",
          status: "idle",
          _count: { assignedStories: 0, costEvents: 0 },
        }),
      });
    }
    return route.continue();
  });
}

function setupAgentDetailRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/orgs/${TEST_ORG.id}/agents/agent-1`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AGENT_DETAIL),
      });
    }
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AGENT_DETAIL),
      });
    }
    if (route.request().method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

function setupCostRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/projects/${TEST_PROJECT.id}/costs**`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalCostCents: 350,
        totalTokens: 60000,
        totalInputTokens: 50000,
        totalOutputTokens: 10000,
        invocationCount: 5,
        byAgent: [],
        byModel: [{ model: "claude-sonnet-4-20250514", costCents: 350, tokenCount: 60000 }],
        byDay: [{ date: "2026-03-29", costCents: 200 }, { date: "2026-03-30", costCents: 150 }],
        period: { from: "2026-03-01T00:00:00.000Z", to: "2026-03-30T23:59:59.000Z" },
      }),
    });
  });
}

test.describe("Agents Page", () => {
  test("agents page loads with sidebar navigation", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Sidebar should show Agents link
    const sidebarLink = page.getByTestId("sidebar-agents");
    await expect(sidebarLink).toBeVisible({ timeout: 5000 });

    // Agent list should load
    await expect(page.getByTestId("agent-list")).toBeVisible({ timeout: 5000 });
  });

  test("empty state shown when no agents", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page, []);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    await expect(page.getByText("No agents yet")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("create-agent-btn-empty")).toBeVisible();
  });

  test("create agent dialog opens and validates", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Click create button
    await page.getByTestId("create-agent-btn").click();

    // Dialog should open
    await expect(page.getByText("Create Agent")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("agent-name-input")).toBeVisible();
    await expect(page.getByTestId("agent-role-select")).toBeVisible();
    await expect(page.getByTestId("agent-adapter-select")).toBeVisible();

    // Submit button should be disabled when name is empty
    const submitBtn = page.getByTestId("agent-submit-btn");
    await expect(submitBtn).toBeDisabled();

    // Fill in name, submit button should become enabled
    await page.getByTestId("agent-name-input").fill("Test Agent");
    await expect(submitBtn).toBeEnabled();
  });

  test("agent card shows status badge", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Wait for cards to render
    const card = page.getByTestId("agent-card-Frontend Coder");
    await expect(card).toBeVisible({ timeout: 5000 });

    // Card should show status badge text
    await expect(card).toContainText("idle");
    await expect(card).toContainText("Frontend Coder");
    await expect(card).toContainText("12 completed");

    // Second card should show paused status
    const card2 = page.getByTestId("agent-card-QA Tester");
    await expect(card2).toBeVisible();
    await expect(card2).toContainText("paused");
  });

  test("agent detail page loads with tabs", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents/agent-1`);

    // Agent detail should load
    await expect(page.getByTestId("agent-detail")).toBeVisible({ timeout: 5000 });

    // Should show agent name
    await expect(page.getByText("Frontend Coder")).toBeVisible();

    // Should show all three tabs
    await expect(page.getByRole("tab", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Cost" })).toBeVisible();

    // Settings tab should be active by default with the edit form
    await expect(page.getByTestId("agent-edit-name")).toBeVisible();
  });

  test("pause and terminate actions are visible for active agent", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents/agent-1`);

    await expect(page.getByTestId("agent-detail")).toBeVisible({ timeout: 5000 });

    // Pause button should be visible (agent is idle)
    await expect(page.getByTestId("agent-pause-btn")).toBeVisible();

    // Terminate button should be visible
    await expect(page.getByTestId("agent-terminate-btn")).toBeVisible();

    // Click terminate to see confirmation dialog
    await page.getByTestId("agent-terminate-btn").click();
    await expect(page.getByText("Terminate agent?")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("This will permanently terminate the agent")).toBeVisible();

    // Cancel button should dismiss dialog
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
