import type { Page } from "@playwright/test";

export async function waitForToast(page: Page, text: string | RegExp, timeout = 5000) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await toast.waitFor({ state: "visible", timeout });
  return toast;
}

export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  method: string = "GET",
  timeout = 10000
) {
  return page.waitForResponse(
    (resp) =>
      (typeof urlPattern === "string"
        ? resp.url().includes(urlPattern)
        : urlPattern.test(resp.url())) &&
      resp.request().method() === method,
    { timeout }
  );
}

export async function dismissToasts(page: Page) {
  const toasts = page.locator("[data-sonner-toast]");
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    const closeBtn = toasts.nth(i).locator("button[aria-label='Close']");
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  }
}
