import type { Page } from "@playwright/test";
import { TEST_PROJECT, TEST_STORIES, TEST_USER, TEST_ORG } from "./test-data";
import { makeStory } from "./test-data";

/**
 * Sets up route handlers for the board view.
 * We let GET requests pass through to the real API (seeded test DB),
 * and only mock write operations for control.
 */
export async function setupBoardHandlers(page: Page) {
  // Mock story creation (POST only) — prevents writing to DB
  await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(
          makeStory({
            shortId: `SF-${Math.floor(Math.random() * 900) + 100}`,
            title: "New story",
            status: "BACKLOG",
            projectId: TEST_PROJECT.id,
          })
        ),
      });
    }
    // GET and other methods pass through to real API
    return route.continue();
  });

  // Mock story move (PATCH)
  await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*/move`, (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}

/**
 * Sets up route handlers for the story detail modal.
 * Mocks write operations to prevent DB mutations.
 * GET requests pass through to real API.
 */
export async function setupStoryDetailHandlers(page: Page, storyId: string) {
  // Mock story PATCH (edits) — prevent DB writes
  await page.route(
    `**/api/projects/${TEST_PROJECT.id}/stories/${storyId}`,
    (route) => {
      if (route.request().method() === "PATCH") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(makeStory({ id: storyId, projectId: TEST_PROJECT.id })),
        });
      }
      // GET passes through to real API
      return route.continue();
    }
  );

  // Mock comment POST and DELETE — prevent DB writes
  await page.route(
    `**/api/projects/${TEST_PROJECT.id}/stories/${storyId}/comments`,
    (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: `comment-${Date.now()}`,
            content: "New test comment",
            createdAt: "2026-01-15T10:00:00.000Z",
            userId: TEST_USER.id,
            user: {
              id: TEST_USER.id,
              name: TEST_USER.name,
              image: TEST_USER.image,
            },
          }),
        });
      }
      // GET passes through to real API (seeded comments)
      return route.continue();
    }
  );

  // Mock comment DELETE
  await page.route(
    `**/api/projects/${TEST_PROJECT.id}/stories/${storyId}/comments/*`,
    (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    }
  );
}

export async function setupSettingsHandlers(page: Page) {
  // Mock project PATCH — prevent DB writes
  await page.route(`**/api/projects/${TEST_PROJECT.id}`, (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...TEST_PROJECT, id: TEST_PROJECT.id }),
      });
    }
    return route.continue();
  });

  // Mock webhook creation — prevent DB writes
  await page.route(`**/api/projects/${TEST_PROJECT.id}/webhooks`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "webhook-1",
          url: "https://example.com/webhook",
          events: ["story.moved"],
          active: true,
        }),
      });
    }
    // GET passes through to real API
    return route.continue();
  });
}

export async function setupSprintHandlers(page: Page) {
  // Mock sprint creation — prevent DB writes
  await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: `sprint-${Date.now()}`,
          name: "New Sprint",
          goal: "New sprint goal",
          status: "PLANNING",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    }
    return route.continue();
  });

  // Mock sprint PATCH
  await page.route(`**/api/projects/${TEST_PROJECT.id}/sprints/*`, (route) => {
    if (route.request().method() === "PATCH") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
    return route.continue();
  });
}
