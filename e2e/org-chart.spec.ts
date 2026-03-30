import { test, expect } from "./fixtures/auth.fixture";

test.describe("Org Chart", () => {
  test("org chart page loads", async ({ authenticatedPage: page }) => {
    // Mock the agent tree API
    await page.route("**/api/orgs/*/agents/tree", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "agent-1",
            name: "lead-architect",
            role: "architect",
            title: "Lead Architect",
            icon: null,
            status: "idle",
            reportsTo: null,
            storiesCompleted: 12,
            subordinateCount: 2,
          },
          {
            id: "agent-2",
            name: "frontend-coder",
            role: "coder",
            title: "Frontend Dev",
            icon: null,
            status: "running",
            reportsTo: "agent-1",
            storiesCompleted: 8,
            subordinateCount: 0,
          },
          {
            id: "agent-3",
            name: "qa-tester",
            role: "qa",
            title: "QA Lead",
            icon: null,
            status: "idle",
            reportsTo: "agent-1",
            storiesCompleted: 5,
            subordinateCount: 0,
          },
        ]),
      });
    });

    await page.goto("/org/org-chart");

    const chart = page.getByTestId("org-chart");
    await expect(chart).toBeVisible({ timeout: 10000 });
    await expect(chart).toContainText("Org Chart");
    await expect(chart).toContainText("3 agents");
  });

  test("agent nodes display with status badges", async ({ authenticatedPage: page }) => {
    await page.route("**/api/orgs/*/agents/tree", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "agent-1",
            name: "lead-architect",
            role: "architect",
            title: "Lead Architect",
            icon: null,
            status: "idle",
            reportsTo: null,
            storiesCompleted: 12,
            subordinateCount: 1,
          },
          {
            id: "agent-2",
            name: "frontend-coder",
            role: "coder",
            title: "Frontend Dev",
            icon: null,
            status: "running",
            reportsTo: "agent-1",
            storiesCompleted: 8,
            subordinateCount: 0,
          },
        ]),
      });
    });

    await page.goto("/org/org-chart");

    const chart = page.getByTestId("org-chart");
    await expect(chart).toBeVisible({ timeout: 10000 });

    // Check that agent nodes are rendered with name and status
    const architectNode = page.getByTestId("org-chart-node-lead-architect");
    await expect(architectNode).toBeVisible({ timeout: 5000 });
    await expect(architectNode).toContainText("lead-architect");
    await expect(architectNode).toContainText("idle");
    await expect(architectNode).toContainText("Architect");

    const coderNode = page.getByTestId("org-chart-node-frontend-coder");
    await expect(coderNode).toBeVisible({ timeout: 5000 });
    await expect(coderNode).toContainText("frontend-coder");
    await expect(coderNode).toContainText("running");
    await expect(coderNode).toContainText("Coder");
  });

  test("click node navigates to detail", async ({ authenticatedPage: page }) => {
    await page.route("**/api/orgs/*/agents/tree", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "agent-1",
            name: "lead-architect",
            role: "architect",
            title: "Lead Architect",
            icon: null,
            status: "idle",
            reportsTo: null,
            storiesCompleted: 12,
            subordinateCount: 0,
          },
        ]),
      });
    });

    await page.goto("/org/org-chart");

    const chart = page.getByTestId("org-chart");
    await expect(chart).toBeVisible({ timeout: 10000 });

    const agentNode = page.getByTestId("org-chart-node-lead-architect");
    await expect(agentNode).toBeVisible({ timeout: 5000 });

    // Click the node to navigate
    await agentNode.click();

    // The OrgChartNode navigates to /org/org-chart on click
    await page.waitForURL("**/org/org-chart", { timeout: 5000 });
    expect(page.url()).toContain("/org/org-chart");
  });

  test("shows empty state when no agents exist", async ({ authenticatedPage: page }) => {
    await page.route("**/api/orgs/*/agents/tree", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/org/org-chart");

    const chart = page.getByTestId("org-chart");
    await expect(chart).toBeVisible({ timeout: 10000 });

    // Should show empty state message
    await expect(chart).toContainText("No agents yet");
    await expect(chart).toContainText("Create agents in your projects");
  });
});
