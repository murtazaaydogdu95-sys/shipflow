import { test as base, type Page } from "@playwright/test";

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * The `authenticatedPage` fixture is simply the default page.
 * Authentication is handled by Playwright's storageState (set in playwright.config.ts)
 * which loads the JWT cookie saved by e2e/auth.setup.ts.
 *
 * This means ALL tests in the "chromium" project are already authenticated.
 * The fixture exists for backward compatibility with existing tests.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    // Wait for server to be healthy before each test
    await page.request.get(`${baseURL}/api/health`).catch(() => {});

    // page already has auth cookies loaded via storageState
    await use(page);

    // Navigate to about:blank after each test to stop SWR polling
    // and release server-side resources between tests
    await page.goto("about:blank").catch(() => {});
    // Brief pause for SWR cleanup
    await page.waitForTimeout(500);
  },
});

export { expect } from "@playwright/test";
