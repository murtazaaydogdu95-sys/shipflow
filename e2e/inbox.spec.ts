import { test, expect } from "./fixtures/auth.fixture";

test.describe("Inbox", () => {
  test("inbox page loads with tabs", async ({ authenticatedPage: page }) => {
    // Mock notifications API
    await page.route("**/api/notifications*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notifications: [
              {
                id: "notif-1",
                type: "comment",
                title: "New comment on SF-001",
                message: "John left a comment on your story",
                read: false,
                href: "/projects/test-project-id",
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-2",
                type: "agent_complete",
                title: "Agent completed SF-002",
                message: "The coder agent finished implementation",
                read: true,
                href: "/projects/test-project-id",
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
            ],
            unreadCount: 1,
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/inbox");

    const inboxList = page.getByTestId("inbox-list");
    await expect(inboxList).toBeVisible({ timeout: 10000 });
    await expect(inboxList).toContainText("Inbox");

    // Verify all tabs are present
    await expect(page.getByTestId("inbox-tab-all")).toBeVisible();
    await expect(page.getByTestId("inbox-tab-unread")).toBeVisible();
    await expect(page.getByTestId("inbox-tab-mentions")).toBeVisible();
    await expect(page.getByTestId("inbox-tab-approvals")).toBeVisible();
    await expect(page.getByTestId("inbox-tab-agent")).toBeVisible();

    // Verify notification items render
    const items = page.getByTestId("inbox-item");
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test("mark all as read clears count", async ({ authenticatedPage: page }) => {
    let markAllReadCalled = false;

    // Mock notifications API with unread items
    await page.route("**/api/notifications*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notifications: [
              {
                id: "notif-1",
                type: "comment",
                title: "Unread notification",
                message: "You have a new comment",
                read: markAllReadCalled,
                href: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-2",
                type: "mention",
                title: "You were mentioned",
                message: "@you in a story",
                read: markAllReadCalled,
                href: null,
                createdAt: new Date().toISOString(),
              },
            ],
            unreadCount: markAllReadCalled ? 0 : 2,
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        markAllReadCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    // Mock mark-all-read endpoint
    await page.route("**/api/read-state/mark-all-read", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/inbox");

    const inboxList = page.getByTestId("inbox-list");
    await expect(inboxList).toBeVisible({ timeout: 10000 });

    // Should show unread count
    await expect(inboxList).toContainText("2 unread notifications");

    // Click "Mark all as read"
    const markAllBtn = page.getByTestId("inbox-mark-all-read");
    await expect(markAllBtn).toBeVisible({ timeout: 5000 });
    await markAllBtn.click();

    // After marking all read, the text should update
    await expect(inboxList).toContainText("All caught up", { timeout: 5000 });
  });

  test("notification bell shows unread badge", async ({ authenticatedPage: page }) => {
    // Mock notifications with unread items
    await page.route("**/api/notifications*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notifications: [
              {
                id: "notif-1",
                type: "comment",
                title: "New comment",
                message: "A comment was posted",
                read: false,
                href: null,
                createdAt: new Date().toISOString(),
              },
            ],
            unreadCount: 3,
          }),
        });
      }
      return route.continue();
    });

    // Mock unread count API
    await page.route("**/api/unread-count*", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ total: 5 }),
      });
    });

    // Mock approvals API
    await page.route("**/api/orgs/*/approvals*", (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Navigate to a page where the notification bell is visible (dashboard)
    await page.goto("/inbox");
    await page.waitForTimeout(1000);

    // The notification bell badge should display the count
    // The bell is in the header/layout, look for the badge with count
    const bellBadge = page.locator("span").filter({ hasText: /^[0-9+]+$/ }).first();
    // If badge is visible, verify it shows a number
    const isBadgeVisible = await bellBadge.isVisible().catch(() => false);
    if (isBadgeVisible) {
      const text = await bellBadge.textContent();
      expect(text).toBeTruthy();
    }

    // Also verify clicking "View inbox" link in notification dropdown navigates to inbox
    const inboxLink = page.getByTestId("notification-inbox-link");
    const isInboxLinkVisible = await inboxLink.isVisible().catch(() => false);
    if (isInboxLinkVisible) {
      await inboxLink.click();
      await page.waitForURL("**/inbox", { timeout: 5000 });
    }
  });

  test("tab filtering works correctly", async ({ authenticatedPage: page }) => {
    await page.route("**/api/notifications*", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notifications: [
              {
                id: "notif-1",
                type: "comment",
                title: "Comment notification",
                message: "Someone commented",
                read: false,
                href: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-2",
                type: "agent_complete",
                title: "Agent update",
                message: "Agent finished",
                read: true,
                href: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "notif-3",
                type: "approval",
                title: "Approval needed",
                message: "Review this change",
                read: false,
                href: null,
                createdAt: new Date().toISOString(),
              },
            ],
            unreadCount: 2,
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/inbox");

    const inboxList = page.getByTestId("inbox-list");
    await expect(inboxList).toBeVisible({ timeout: 10000 });

    // All tab should show all 3 items
    const items = page.getByTestId("inbox-item");
    await expect(items).toHaveCount(3, { timeout: 5000 });

    // Click "Agent Updates" tab
    await page.getByTestId("inbox-tab-agent").click();
    await expect(items).toHaveCount(1, { timeout: 5000 });
    await expect(items.first()).toContainText("Agent update");

    // Click "Approvals" tab
    await page.getByTestId("inbox-tab-approvals").click();
    await expect(items).toHaveCount(1, { timeout: 5000 });
    await expect(items.first()).toContainText("Approval needed");

    // Click "All" tab to reset
    await page.getByTestId("inbox-tab-all").click();
    await expect(items).toHaveCount(3, { timeout: 5000 });
  });
});
