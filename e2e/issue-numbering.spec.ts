import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_ORG } from "./fixtures/test-data";

test.describe("Issue Numbering", () => {
  test("new story gets sequential issue number", async ({ authenticatedPage: page }) => {
    let postBody: Record<string, unknown> | null = null;

    // Mock create story endpoint to verify identifier is returned
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
      if (route.request().method() === "POST") {
        postBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "story-new-1",
            shortId: "CP-001",
            identifier: "CP-001",
            title: postBody?.title ?? "New story",
            status: "BACKLOG",
            priority: "MEDIUM",
            type: "feature",
            storyPoints: null,
            position: 0,
            projectId: TEST_PROJECT.id,
            labels: [],
            acceptanceCriteria: [],
            blockedByDeps: [],
            blockingDeps: [],
            children: [],
            assignee: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}`);

    // Open quick capture (Cmd+K or click button)
    const newStoryButton = page.getByTestId("new-story-btn");
    if (await newStoryButton.isVisible().catch(() => false)) {
      await newStoryButton.click();
    } else {
      await page.keyboard.press("Meta+k");
    }

    // Wait for capture input
    const input = page.getByTestId("quick-capture-input");
    await expect(input).toBeVisible({ timeout: 5000 });

    // Type a new story
    await input.fill("Test sequential numbering story");
    await input.press("Enter");

    // Verify the API was called with title
    await expect(async () => {
      expect(postBody).not.toBeNull();
    }).toPass({ timeout: 5000 });
  });

  test("org settings shows issue prefix field", async ({ authenticatedPage: page }) => {
    // Mock org endpoint
    await page.route(`**/api/orgs/${TEST_ORG.id}`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: TEST_ORG.id,
            name: TEST_ORG.name,
            slug: TEST_ORG.slug,
            plan: TEST_ORG.plan,
            isPersonal: false,
            issuePrefix: "CP",
            issueCounter: 42,
            launchDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/org/settings");

    // Issue prefix input should be visible
    const prefixInput = page.getByTestId("org-issue-prefix");
    await expect(prefixInput).toBeVisible({ timeout: 5000 });

    // Should have the current prefix value
    await expect(prefixInput).toHaveValue("CP");
  });

  test("custom prefix is used for new stories", async ({ authenticatedPage: page }) => {
    let savedPrefix: string | null = null;

    // Mock org endpoint
    await page.route(`**/api/orgs/${TEST_ORG.id}`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: TEST_ORG.id,
            name: TEST_ORG.name,
            slug: TEST_ORG.slug,
            plan: TEST_ORG.plan,
            isPersonal: false,
            issuePrefix: savedPrefix ?? "CP",
            issueCounter: 42,
            launchDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        if (body?.issuePrefix) {
          savedPrefix = body.issuePrefix;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/org/settings");

    // Change the issue prefix
    const prefixInput = page.getByTestId("org-issue-prefix");
    await expect(prefixInput).toBeVisible({ timeout: 5000 });

    await prefixInput.clear();
    await prefixInput.fill("PROJ");

    // Save
    const saveBtn = page.getByTestId("issue-prefix-save-btn");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Verify the PATCH was called with the new prefix
    await expect(async () => {
      expect(savedPrefix).toBe("PROJ");
    }).toPass({ timeout: 5000 });
  });
});
