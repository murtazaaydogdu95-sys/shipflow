import { test, expect } from "./fixtures/auth.fixture";
import { BoardPage } from "./helpers/page-objects/board.page";
import { StoryModalPage } from "./helpers/page-objects/story-modal.page";
import { TEST_PROJECT, TEST_STORIES, makeStory } from "./fixtures/test-data";

test.describe("Story Transitions @critical", () => {
  test("can move story from BACKLOG to TODO via status dropdown", async ({
    authenticatedPage: page,
  }) => {
    let patchCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.backlog1.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          patchCalled = true;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.backlog1,
                status: "TODO",
                projectId: TEST_PROJECT.id,
              })
            ),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Change status via the status dropdown
    const statusSelect = page.getByTestId("story-detail-status");
    await statusSelect.click();
    await page.getByRole("option", { name: /todo/i }).click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can move story from TODO to IN_PROGRESS", async ({
    authenticatedPage: page,
  }) => {
    let patchCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          patchCalled = true;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.todo1,
                status: "IN_PROGRESS",
                projectId: TEST_PROJECT.id,
              })
            ),
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

    const statusSelect = page.getByTestId("story-detail-status");
    await statusSelect.click();
    await page.getByRole("option", { name: /in.progress/i }).click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can move story from IN_PROGRESS to REVIEW", async ({
    authenticatedPage: page,
  }) => {
    let patchCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.inProgress1.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          patchCalled = true;
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.inProgress1,
                status: "REVIEW",
                projectId: TEST_PROJECT.id,
              })
            ),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.inProgress1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    const statusSelect = page.getByTestId("story-detail-status");
    await statusSelect.click();
    await page.getByRole("option", { name: /review/i }).click();

    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("can move story through complete lifecycle BACKLOG -> TODO -> IN_PROGRESS -> REVIEW -> DONE", async ({
    authenticatedPage: page,
  }) => {
    // Track each transition
    const transitions: string[] = [];
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.backlog2.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          const body = route.request().postDataJSON();
          if (body?.status) {
            transitions.push(body.status);
          }
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.backlog2,
                status: body?.status || "BACKLOG",
                projectId: TEST_PROJECT.id,
              })
            ),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.backlog2.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    const statusSelect = page.getByTestId("story-detail-status");

    // BACKLOG -> TODO
    await statusSelect.click();
    await page.getByRole("option", { name: /todo/i }).click();
    await page.waitForTimeout(500);

    // TODO -> IN_PROGRESS
    await statusSelect.click();
    await page.getByRole("option", { name: /in.progress/i }).click();
    await page.waitForTimeout(500);

    // IN_PROGRESS -> REVIEW
    await statusSelect.click();
    await page.getByRole("option", { name: /review/i }).click();
    await page.waitForTimeout(500);

    // REVIEW -> DONE
    await statusSelect.click();
    await page.getByRole("option", { name: /done/i }).click();

    await expect(async () => {
      expect(transitions).toContain("TODO");
      expect(transitions).toContain("IN_PROGRESS");
      expect(transitions).toContain("REVIEW");
      expect(transitions).toContain("DONE");
    }).toPass({ timeout: 5000 });
  });

  test("rejects invalid transition from BACKLOG directly to DONE", async ({
    authenticatedPage: page,
  }) => {
    let patchCalled = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.backlog1.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          const body = route.request().postDataJSON();
          if (body?.status === "DONE") {
            patchCalled = true;
            return route.fulfill({
              status: 422,
              contentType: "application/json",
              body: JSON.stringify({
                error: "Invalid status transition from BACKLOG to DONE",
              }),
            });
          }
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.backlog1,
                status: body?.status || "BACKLOG",
                projectId: TEST_PROJECT.id,
              })
            ),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.backlog1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Try to change status directly to DONE
    const statusSelect = page.getByTestId("story-detail-status");
    await statusSelect.click();
    await page.getByRole("option", { name: /done/i }).click();

    // The server should reject with 422
    await expect(async () => {
      expect(patchCalled).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test("agent story in REVIEW requires reviewedAt before moving to DONE (422 response)", async ({
    authenticatedPage: page,
  }) => {
    let gotRejected = false;
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.review1.id}`,
      (route) => {
        if (route.request().method() === "PATCH") {
          const body = route.request().postDataJSON();
          if (body?.status === "DONE") {
            gotRejected = true;
            return route.fulfill({
              status: 422,
              contentType: "application/json",
              body: JSON.stringify({
                error: "Agent stories require code review before approval. View the Diff tab first.",
              }),
            });
          }
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                ...TEST_STORIES.review1,
                status: body?.status || "REVIEW",
                projectId: TEST_PROJECT.id,
                assignedToAgent: true,
                agentStatus: "COMPLETED",
              })
            ),
          });
        }
        return route.continue();
      }
    );

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.review1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // Try to move to DONE without reviewing
    const statusSelect = page.getByTestId("story-detail-status");
    await statusSelect.click();
    await page.getByRole("option", { name: /done/i }).click();

    // The server should reject with 422
    await expect(async () => {
      expect(gotRejected).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
