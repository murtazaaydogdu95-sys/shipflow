import type { Page } from "@playwright/test";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface MockOptions {
  status?: number;
  body?: unknown;
  contentType?: string;
}

export async function mockApiRoute(
  page: Page,
  urlPattern: string,
  method: HttpMethod,
  options: MockOptions = {}
) {
  const { status = 200, body = {}, contentType = "application/json" } = options;

  await page.route(urlPattern, (route) => {
    if (route.request().method() === method) {
      return route.fulfill({
        status,
        contentType,
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
    }
    return route.continue();
  });
}

export async function mockApiError(
  page: Page,
  urlPattern: string,
  method: HttpMethod,
  errorMessage: string,
  status = 500
) {
  await mockApiRoute(page, urlPattern, method, {
    status,
    body: { error: errorMessage },
  });
}
