import type { Page } from "@playwright/test";
import { TEST_USER, TEST_ORG } from "../fixtures/test-data";

export async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/session", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: TEST_USER.id,
          name: TEST_USER.name,
          email: TEST_USER.email,
          image: TEST_USER.image,
          orgId: TEST_ORG.id,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
  });

  await page.route("**/api/auth/csrf", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "test-csrf-token" }),
    });
  });

  await page.route("**/api/auth/providers", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        github: {
          id: "github",
          name: "GitHub",
          type: "oauth",
          signinUrl: "/api/auth/signin/github",
          callbackUrl: "/api/auth/callback/github",
        },
        credentials: {
          id: "credentials",
          name: "Credentials",
          type: "credentials",
          signinUrl: "/api/auth/signin/credentials",
          callbackUrl: "/api/auth/callback/credentials",
        },
      }),
    });
  });

  // Handle signout — clear session for subsequent requests
  await page.route("**/api/auth/signout", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/login" }),
    });
  });
}

export async function mockUnauthenticatedSession(page: Page) {
  await page.route("**/api/auth/session", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}
