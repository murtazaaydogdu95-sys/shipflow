import { test, expect } from "./fixtures/auth.fixture";
import { TEST_PROJECT } from "./fixtures/test-data";

test.describe("Dark/Light Theme", () => {
  test("theme toggle button is visible", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    await expect(page.getByTestId("theme-toggle")).toBeVisible({ timeout: 5000 });
  });

  test("clicking toggle switches to dark mode", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible({ timeout: 5000 });

    await toggle.click();

    // next-themes adds the "dark" class to the <html> element
    await expect(async () => {
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).toContain("dark");
    }).toPass({ timeout: 5000 });
  });

  test("theme persists after page reload", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // Switch to dark mode
    await toggle.click();

    await expect(async () => {
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).toContain("dark");
    }).toPass({ timeout: 5000 });

    // Reload the page
    await page.reload();

    // Theme should persist (next-themes stores in localStorage)
    await expect(async () => {
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).toContain("dark");
    }).toPass({ timeout: 5000 });
  });

  test("clicking toggle again switches back to light", async ({ authenticatedPage: page }) => {
    await page.goto(`/projects/${TEST_PROJECT.id}`);
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible({ timeout: 5000 });

    // First click: switch to dark
    await toggle.click();
    await expect(async () => {
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).toContain("dark");
    }).toPass({ timeout: 5000 });

    // Second click: switch back to light
    await toggle.click();
    await expect(async () => {
      const htmlClass = await page.locator("html").getAttribute("class");
      expect(htmlClass).not.toContain("dark");
    }).toPass({ timeout: 5000 });
  });
});
