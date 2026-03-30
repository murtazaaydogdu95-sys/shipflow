import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES } from "./fixtures/test-data";

test.describe("Sub-tasks", () => {
  test("story detail shows sub-task section", async ({ authenticatedPage: page }) => {
    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Sub-task list should be visible in story detail
    const subtaskList = page.getByTestId("subtask-list");
    await expect(subtaskList).toBeVisible({ timeout: 5000 });
    await expect(subtaskList).toContainText("Sub-tasks");
  });

  test("can create a sub-task", async ({ authenticatedPage: page }) => {
    // Mock story creation for sub-task
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories`,
      (route) => {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          if (body?.parentId) {
            return route.fulfill({
              status: 201,
              contentType: "application/json",
              body: JSON.stringify({
                id: "new-subtask-id",
                shortId: "SF-100",
                title: body.title,
                status: "BACKLOG",
                priority: body.priority || "MEDIUM",
                type: body.type || "feature",
                parentId: body.parentId,
              }),
            });
          }
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Click "Add sub-task" button
    const addBtn = page.getByTestId("subtask-add-btn");
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Fill in the sub-task title
    const titleInput = page.getByTestId("subtask-title-input");
    await expect(titleInput).toBeVisible({ timeout: 3000 });
    await titleInput.fill("New sub-task for testing");

    // Click "Add" button
    const createBtn = page.getByTestId("subtask-create-btn");
    await createBtn.click();

    // The form should close after successful creation (toast appears)
    await expect(titleInput).not.toBeVisible({ timeout: 5000 });
  });

  test("sub-task count shows on board card", async ({ authenticatedPage: page }) => {
    // Mock stories API to return a story with children
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories?*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: TEST_STORIES.todo1.id,
                shortId: TEST_STORIES.todo1.shortId,
                title: TEST_STORIES.todo1.title,
                status: "TODO",
                priority: "HIGH",
                type: "feature",
                storyPoints: 5,
                position: 0,
                parentId: null,
                labels: [],
                acceptanceCriteria: [],
                blockedByDeps: [],
                blockingDeps: [],
                assignee: null,
                assignedToAgent: false,
                agentStatus: null,
                children: [
                  { id: "sub-1", shortId: "SF-101", title: "Sub 1", status: "DONE" },
                  { id: "sub-2", shortId: "SF-102", title: "Sub 2", status: "TODO" },
                ],
              },
            ]),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    // The card should show sub-task indicator
    const card = board.getStoryCard(TEST_STORIES.todo1.shortId);
    await expect(card).toBeVisible({ timeout: 5000 });
    // Look for sub-task count text (e.g. "1/2")
    await expect(card).toContainText(/\d+\/\d+/);
  });

  test("sub-task progress bar updates", async ({ authenticatedPage: page }) => {
    // Mock story detail to include children with mixed statuses
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: TEST_STORIES.todo1.id,
              shortId: TEST_STORIES.todo1.shortId,
              title: TEST_STORIES.todo1.title,
              description: null,
              status: "TODO",
              priority: "HIGH",
              type: "feature",
              storyPoints: 5,
              position: 0,
              parentId: null,
              labels: [],
              acceptanceCriteria: [],
              blockedByDeps: [],
              blockingDeps: [],
              assignee: null,
              assignedToAgent: false,
              agentStatus: null,
              children: [
                { id: "sub-1", shortId: "SF-101", title: "Done task", status: "DONE", priority: "MEDIUM", type: "feature" },
                { id: "sub-2", shortId: "SF-102", title: "Todo task", status: "TODO", priority: "HIGH", type: "feature" },
                { id: "sub-3", shortId: "SF-103", title: "In progress", status: "IN_PROGRESS", priority: "LOW", type: "chore" },
              ],
            }),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Check progress text shows "1/3 done"
    const subtaskList = page.getByTestId("subtask-list");
    await expect(subtaskList).toBeVisible({ timeout: 5000 });
    await expect(subtaskList).toContainText("1/3 done");

    // Progress bar should be present
    const progressBar = page.getByTestId("subtask-progress");
    await expect(progressBar).toBeVisible();
  });
});
