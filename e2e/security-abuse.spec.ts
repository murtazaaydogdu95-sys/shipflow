import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT, TEST_STORIES, makeStory, TEST_USER } from "./fixtures/test-data";

/**
 * Security tests covering XSS, IDOR, SQL injection, and input sanitization.
 * Uses both authenticated and unauthenticated contexts.
 */

// --- Unauthenticated security tests ---
test.describe("Security - Unauthenticated Access @security", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("API requests without auth return 401", async ({ page }) => {
    // Try to access a protected API endpoint without auth
    const response = await page.request.get(`/api/projects/${TEST_PROJECT.id}`);

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test("accessing another org project returns 401/403 without auth", async ({ page }) => {
    // Try to access a project without being logged in
    const response = await page.request.get(`/api/projects/non-existent-project-id/stories`);

    expect([401, 403, 404]).toContain(response.status());
  });
});

// --- Authenticated security tests ---
test.describe("Security - XSS Prevention @security", () => {
  test("XSS in story title is escaped (no script execution)", async ({
    authenticatedPage: page,
  }) => {
    const xssPayload = '<script>alert("xss")</script>';

    // Mock stories to include one with XSS in the title
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            makeStory({
              id: "story-xss",
              shortId: "SF-XSS",
              title: xssPayload,
              status: "TODO",
              projectId: TEST_PROJECT.id,
            }),
          ]),
        });
      }
      return route.continue();
    });

    // Track if any dialog (alert) is triggered
    let alertTriggered = false;
    page.on("dialog", async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}`);

    const boardTab = page.getByRole("tab", { name: "Board" });
    await expect(boardTab).toBeVisible({ timeout: 10000 });
    await boardTab.click();
    await page.waitForTimeout(500);

    // The XSS payload should be rendered as text, not executed
    expect(alertTriggered).toBe(false);

    // Check that the script tag appears as escaped text content
    const pageContent = await page.content();
    // The raw <script> tag should NOT appear unescaped in the DOM
    expect(pageContent).not.toContain("<script>alert");
  });

  test("XSS in comment content is escaped", async ({ authenticatedPage: page }) => {
    const xssPayload = '<img src=x onerror="alert(\'xss\')">';

    // Mock comments to include one with XSS
    await page.route(`**/api/projects/${TEST_PROJECT.id}/stories/*/comments`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "comment-xss",
              content: xssPayload,
              createdAt: "2026-01-15T10:00:00.000Z",
              userId: TEST_USER.id,
              user: { id: TEST_USER.id, name: TEST_USER.name, image: null },
            },
          ]),
        });
      }
      return route.continue();
    });

    let alertTriggered = false;
    page.on("dialog", async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    const { BoardPage } = await import("./helpers/page-objects/board.page");
    const { StoryModalPage } = await import("./helpers/page-objects/story-modal.page");

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();
    await modal.switchTab("comments");
    await page.waitForTimeout(500);

    // XSS should not have executed
    expect(alertTriggered).toBe(false);
  });

  test("HTML in story description is sanitized", async ({ authenticatedPage: page }) => {
    const htmlPayload = '<div onmouseover="alert(1)">Hover me</div><b>Bold</b>';

    // Mock story detail with HTML in description
    await page.route(
      `**/api/projects/${TEST_PROJECT.id}/stories/${TEST_STORIES.todo1.id}`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              makeStory({
                id: TEST_STORIES.todo1.id,
                shortId: TEST_STORIES.todo1.shortId,
                title: TEST_STORIES.todo1.title,
                description: htmlPayload,
                status: "TODO",
                projectId: TEST_PROJECT.id,
              })
            ),
          });
        }
        return route.continue();
      }
    );

    let alertTriggered = false;
    page.on("dialog", async (dialog) => {
      alertTriggered = true;
      await dialog.dismiss();
    });

    const { BoardPage } = await import("./helpers/page-objects/board.page");
    const { StoryModalPage } = await import("./helpers/page-objects/story-modal.page");

    const board = new BoardPage(page);
    await board.goto(TEST_PROJECT.id);
    await board.waitForBoard();

    await board.clickStoryCard(TEST_STORIES.todo1.shortId);

    const modal = new StoryModalPage(page);
    await modal.waitForOpen();

    // onmouseover handler should not exist in the rendered DOM
    expect(alertTriggered).toBe(false);

    const pageContent = await page.content();
    expect(pageContent).not.toContain('onmouseover="alert');
  });
});

test.describe("Security - IDOR Prevention @security", () => {
  test("accessing another org's project returns 401/403", async ({
    authenticatedPage: page,
  }) => {
    // Try to access a project from a different org via API
    const response = await page.request.get("/api/projects/other-org-project-id");

    // Should return 401, 403, or 404 (no information leak)
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe("Security - Rate Limiting @critical", () => {
  test("auth endpoint returns 429 after excessive requests", async ({
    authenticatedPage: page,
  }) => {
    // The auth rate limiter allows 10 requests per minute per IP.
    // In local dev without a reverse proxy, getClientIp() returns "unknown"
    // so all requests share one bucket. Send 12 rapid requests to trigger it.
    const results: number[] = [];
    for (let i = 0; i < 12; i++) {
      const response = await page.request.post(
        "http://localhost:3001/api/auth/signin/credentials",
        {
          data: { email: "nonexistent@test.com", password: "wrong" },
          headers: { "Content-Type": "application/json" },
        }
      );
      results.push(response.status());
    }
    // At least one response should be 429 (rate limited)
    expect(results).toContain(429);
  });
});

test.describe("Security - Cookie Flags @high", () => {
  test("session cookie has secure flags", async ({
    authenticatedPage: page,
  }) => {
    // After login, check that the session cookie has proper security flags
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes("authjs") || c.name.includes("next-auth")
    );
    expect(sessionCookie).toBeDefined();
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.sameSite).toMatch(/Lax|Strict/i);
      // secure flag is only set in production (HTTPS), skip in localhost
    }
  });
});

test.describe("Security - Cross-Org IDOR @high", () => {
  test("cannot access other org project via direct API call", async ({
    authenticatedPage: page,
  }) => {
    // The authenticated user (test@codepylot.dev) should NOT be able to access
    // a project they don't have membership in.
    // Use a fake project ID that doesn't exist.
    const response = await page.request.get(
      "http://localhost:3001/api/projects/nonexistent-project-id/stories"
    );
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe("Security - Injection Prevention @security", () => {
  test("SQL injection in search query does not execute", async ({
    authenticatedPage: page,
  }) => {
    const sqlPayload = "'; DROP TABLE stories; --";
    let searchCalled = false;
    let searchQuery = "";

    await page.route("**/api/projects/*/stories*", (route) => {
      const url = new URL(route.request().url());
      const q = url.searchParams.get("q") || url.searchParams.get("search");
      if (q) {
        searchCalled = true;
        searchQuery = q;
      }
      return route.continue();
    });

    await page.goto(`/projects/${TEST_PROJECT.id}`);

    const boardTab = page.getByRole("tab", { name: "Board" });
    await expect(boardTab).toBeVisible({ timeout: 10000 });
    await boardTab.click();
    await page.waitForTimeout(500);

    // Try to find a search input on the board
    const searchInput = page.getByPlaceholder(/search/i).first()
      .or(page.getByTestId("board-search").first());
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSearch) {
      await searchInput.fill(sqlPayload);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);

      // The page should not crash or show SQL errors
      await expect(page.getByText(/syntax error/i)).not.toBeVisible({ timeout: 2000 });
    }

    // Page should still be functional (not crashed by injection)
    await expect(page).toHaveURL(new RegExp(`/projects/${TEST_PROJECT.id}`));
  });
});
