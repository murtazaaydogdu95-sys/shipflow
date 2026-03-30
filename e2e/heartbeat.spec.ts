import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

const MOCK_AGENT_DETAIL = {
  id: "agent-1",
  name: "Frontend Coder",
  role: "coder",
  title: "Senior React Developer",
  status: "idle",
  adapterType: "claude",
  capabilities: "React, TypeScript, CSS",
  storiesCompleted: 12,
  totalCostCents: 350,
  heartbeatEnabled: false,
  heartbeatCron: null,
  nextHeartbeatAt: null,
  lastHeartbeatAt: null,
  pauseReason: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignedStories: [],
  subordinates: [],
  reportingAgent: null,
  costSummary: {
    totalCostCents: 350,
    totalInputTokens: 50000,
    totalOutputTokens: 10000,
    eventCount: 5,
  },
  _count: { assignedStories: 3, costEvents: 5 },
};

const MOCK_HEARTBEAT_RUNS = [
  {
    id: "hb-run-1",
    agentId: "agent-1",
    source: "scheduled",
    status: "succeeded",
    startedAt: "2026-03-30T09:00:00.000Z",
    finishedAt: "2026-03-30T09:00:15.000Z",
    exitCode: 0,
    inputTokens: 200,
    outputTokens: 50,
    costCents: 1,
    errorMessage: null,
    createdAt: "2026-03-30T09:00:00.000Z",
  },
  {
    id: "hb-run-2",
    agentId: "agent-1",
    source: "scheduled",
    status: "failed",
    startedAt: "2026-03-30T06:00:00.000Z",
    finishedAt: "2026-03-30T06:00:10.000Z",
    exitCode: 1,
    inputTokens: 150,
    outputTokens: 0,
    costCents: 0,
    errorMessage: "Connection timeout",
    createdAt: "2026-03-30T06:00:00.000Z",
  },
  {
    id: "hb-run-3",
    agentId: "agent-1",
    source: "manual",
    status: "succeeded",
    startedAt: "2026-03-29T15:00:00.000Z",
    finishedAt: "2026-03-29T15:00:12.000Z",
    exitCode: 0,
    inputTokens: 180,
    outputTokens: 40,
    costCents: 1,
    errorMessage: null,
    createdAt: "2026-03-29T15:00:00.000Z",
  },
];

function setupAgentDetailRoute(
  page: import("@playwright/test").Page,
  agent = MOCK_AGENT_DETAIL
) {
  return page.route(`**/api/orgs/${TEST_ORG.id}/agents/agent-1`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agent),
      });
    }
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...agent, ...body }),
      });
    }
    return route.continue();
  });
}

function setupAgentListRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/orgs/${TEST_ORG.id}/agents`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([MOCK_AGENT_DETAIL]),
      });
    }
    return route.continue();
  });
}

function setupHeartbeatRunsRoute(page: import("@playwright/test").Page) {
  return page.route(`**/api/orgs/${TEST_ORG.id}/agents/agent-1/heartbeats`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_HEARTBEAT_RUNS),
    });
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
        byModel: [],
        byDay: [],
        period: { from: "2026-03-01T00:00:00.000Z", to: "2026-03-30T23:59:59.000Z" },
      }),
    });
  });
}

test.describe("Agent Heartbeat Tab", () => {
  test("agent detail shows heartbeat tab", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page);
    await setupHeartbeatRunsRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Click on agent to open detail
    await page.getByText("Frontend Coder").click();

    // Should have a Heartbeat tab
    const heartbeatTab = page.getByTestId("agent-tab-heartbeat");
    await expect(heartbeatTab).toBeVisible({ timeout: 5000 });
  });

  test("heartbeat enable toggle works", async ({ authenticatedPage: page }) => {
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page);
    await setupHeartbeatRunsRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Navigate to agent detail
    await page.getByText("Frontend Coder").click();

    // Click Heartbeat tab
    const heartbeatTab = page.getByTestId("agent-tab-heartbeat");
    await expect(heartbeatTab).toBeVisible({ timeout: 5000 });
    await heartbeatTab.click();

    // Toggle heartbeat enabled
    const toggleBtn = page.getByTestId("heartbeat-enable-toggle");
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();

    // Should show cron expression field after enabling
    await expect(page.getByTestId("heartbeat-cron-input")).toBeVisible({ timeout: 3000 });
  });

  test("cron expression input accepts valid expression", async ({ authenticatedPage: page }) => {
    // Start with heartbeat enabled to show the cron field
    const enabledAgent = { ...MOCK_AGENT_DETAIL, heartbeatEnabled: true, heartbeatCron: "0 */6 * * *" };
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page, enabledAgent);
    await setupHeartbeatRunsRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Navigate to agent detail
    await page.getByText("Frontend Coder").click();

    // Click Heartbeat tab
    const heartbeatTab = page.getByTestId("agent-tab-heartbeat");
    await expect(heartbeatTab).toBeVisible({ timeout: 5000 });
    await heartbeatTab.click();

    // Cron input should be visible and have current value
    const cronInput = page.getByTestId("heartbeat-cron-input");
    await expect(cronInput).toBeVisible({ timeout: 5000 });

    // Clear and type new expression
    await cronInput.clear();
    await cronInput.fill("0 9 * * 1-5");

    // The input should accept the value without error
    await expect(cronInput).toHaveValue("0 9 * * 1-5");
  });

  test("heartbeat run history shows in table", async ({ authenticatedPage: page }) => {
    const enabledAgent = {
      ...MOCK_AGENT_DETAIL,
      heartbeatEnabled: true,
      heartbeatCron: "0 */3 * * *",
      lastHeartbeatAt: "2026-03-30T09:00:00.000Z",
    };
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page, enabledAgent);
    await setupHeartbeatRunsRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Navigate to agent detail
    await page.getByText("Frontend Coder").click();

    // Click Heartbeat tab
    const heartbeatTab = page.getByTestId("agent-tab-heartbeat");
    await expect(heartbeatTab).toBeVisible({ timeout: 5000 });
    await heartbeatTab.click();

    // Should show heartbeat run history table
    const runHistory = page.getByTestId("heartbeat-run-history");
    await expect(runHistory).toBeVisible({ timeout: 5000 });

    // Should contain run entries with status indicators
    await expect(page.getByTestId("heartbeat-run-hb-run-1")).toBeVisible();
    await expect(page.getByText("succeeded").first()).toBeVisible();
    await expect(page.getByText("failed").first()).toBeVisible();
  });

  test("heartbeat section shows last heartbeat time", async ({ authenticatedPage: page }) => {
    const enabledAgent = {
      ...MOCK_AGENT_DETAIL,
      heartbeatEnabled: true,
      heartbeatCron: "0 */3 * * *",
      lastHeartbeatAt: "2026-03-30T09:00:00.000Z",
      nextHeartbeatAt: "2026-03-30T12:00:00.000Z",
    };
    await setupAgentListRoute(page);
    await setupAgentDetailRoute(page, enabledAgent);
    await setupHeartbeatRunsRoute(page);
    await setupCostRoute(page);

    await page.goto(`/projects/${TEST_PROJECT.id}/agents`);

    // Navigate to agent detail
    await page.getByText("Frontend Coder").click();

    // Click Heartbeat tab
    const heartbeatTab = page.getByTestId("agent-tab-heartbeat");
    await expect(heartbeatTab).toBeVisible({ timeout: 5000 });
    await heartbeatTab.click();

    // Should display next heartbeat time
    await expect(page.getByTestId("next-heartbeat-time")).toBeVisible({ timeout: 5000 });
  });
});
