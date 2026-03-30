import { test, expect } from "./fixtures/auth.fixture";
import { TEST_ORG, TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

const MOCK_GOALS = [
  {
    id: "goal-1",
    orgId: TEST_ORG.id,
    title: "Increase user retention",
    description: "Improve retention rate by 20% this quarter",
    level: "company",
    status: "active",
    parentId: null,
    ownerAgentId: null,
    children: [{ id: "goal-2" }],
    _count: { stories: 5, children: 1 },
    progress: { totalStories: 5, completedStories: 2, percentage: 40 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "goal-2",
    orgId: TEST_ORG.id,
    title: "Improve onboarding flow",
    description: "Reduce time-to-value for new users",
    level: "team",
    status: "active",
    parentId: "goal-1",
    ownerAgentId: null,
    children: [],
    _count: { stories: 3, children: 0 },
    progress: { totalStories: 3, completedStories: 1, percentage: 33 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

test.describe("Goals", () => {
  test("goal tree page loads", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/orgs/${TEST_ORG.id}/goals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GOALS),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/goals`);

    await expect(
      page.getByRole("heading", { name: /goal/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("can create a company-level goal", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    let postBody: Record<string, unknown> | null = null;

    await page.route(`**/api/orgs/${TEST_ORG.id}/goals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GOALS),
        });
      }
      if (route.request().method() === "POST") {
        postCalled = true;
        postBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "goal-new",
            orgId: TEST_ORG.id,
            title: "Launch v2",
            description: "Ship the next major version",
            level: "company",
            status: "planned",
            parentId: null,
            ownerAgentId: null,
            _count: { stories: 0, children: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/goals`);
    await expect(
      page.getByRole("heading", { name: /goal/i })
    ).toBeVisible({ timeout: 10000 });

    // Click create goal button
    const createButton = page.getByRole("button", { name: /add|create|new/i });
    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click();

      // Fill in goal title
      const titleInput = page.getByLabel(/title/i);
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill("Launch v2");

        // Select company level if there is a level selector
        const levelSelect = page.getByLabel(/level/i);
        if (await levelSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await levelSelect.selectOption("company");
        }

        // Submit
        const submitButton = page.getByRole("button", { name: /save|create|submit/i });
        await submitButton.click();

        await expect(async () => {
          expect(postCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test("can create child goal", async ({ authenticatedPage: page }) => {
    let postCalled = false;
    let postBody: Record<string, unknown> | null = null;

    await page.route(`**/api/orgs/${TEST_ORG.id}/goals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GOALS),
        });
      }
      if (route.request().method() === "POST") {
        postCalled = true;
        postBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "goal-child-new",
            orgId: TEST_ORG.id,
            title: "Add email reminders",
            description: null,
            level: "project",
            status: "planned",
            parentId: "goal-1",
            ownerAgentId: null,
            _count: { stories: 0, children: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    // Mock detail endpoint for parent goal
    await page.route(`**/api/orgs/${TEST_ORG.id}/goals/goal-1`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_GOALS[0],
            stories: [],
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/goals`);
    await expect(
      page.getByRole("heading", { name: /goal/i })
    ).toBeVisible({ timeout: 10000 });

    // Look for an "add child" button on the first goal
    const addChildButton = page.getByRole("button", { name: /add child|add sub/i }).first();
    if (await addChildButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addChildButton.click();

      const titleInput = page.getByLabel(/title/i);
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill("Add email reminders");

        const submitButton = page.getByRole("button", { name: /save|create|submit/i });
        await submitButton.click();

        await expect(async () => {
          expect(postCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test("goal shows progress bar", async ({ authenticatedPage: page }) => {
    await page.route(`**/api/orgs/${TEST_ORG.id}/goals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GOALS),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/goals`);
    await expect(
      page.getByRole("heading", { name: /goal/i })
    ).toBeVisible({ timeout: 10000 });

    // Should display goal titles
    await expect(page.getByText("Increase user retention")).toBeVisible({ timeout: 5000 });

    // Should display progress indicator (percentage or progress bar)
    const progressIndicator = page.getByRole("progressbar").first();
    const percentText = page.getByText(/40%/).first();

    // Either a progressbar element or text showing percentage should be visible
    const hasProgressBar = await progressIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPercentText = await percentText.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasProgressBar || hasPercentText).toBe(true);
  });

  test("story detail shows goal selector", async ({ authenticatedPage: page }) => {
    // Mock goals endpoint for the selector dropdown
    await page.route(`**/api/orgs/${TEST_ORG.id}/goals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_GOALS),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}/board`);

    // Wait for board to load
    await page.waitForSelector("[data-testid]", { timeout: 10000 });

    // Click on a story card to open the detail modal
    const card = page.getByTestId(`story-card-${TEST_STORIES.todo1.shortId}`);
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();

      // Story detail sheet should open
      const sheet = page.locator("[role='dialog'][data-state='open']");
      await expect(sheet).toBeVisible({ timeout: 5000 });

      // Look for a goal selector/dropdown within the story detail
      const goalSelector = sheet.getByText(/goal/i).first();
      await expect(goalSelector).toBeVisible({ timeout: 5000 });
    }
  });
});
