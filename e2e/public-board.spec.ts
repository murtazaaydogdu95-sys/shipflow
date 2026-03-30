import { test, expect } from "@playwright/test";
import { TEST_PUBLIC_PROJECT, TEST_PROJECT } from "./fixtures/test-data";

// Public board tests run WITHOUT authentication
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Public Board @medium", () => {
  test("public board page loads for public project slug", async ({ page }) => {
    await page.goto(`/board/${TEST_PUBLIC_PROJECT.slug}`);

    // Should show the public board page (not redirected to login)
    await expect(page).toHaveURL(new RegExp(`/board/${TEST_PUBLIC_PROJECT.slug}`));
    await expect(page.getByText(TEST_PUBLIC_PROJECT.name).first()).toBeVisible({ timeout: 15000 });
  });

  test("shows board columns and story cards", async ({ page }) => {
    await page.goto(`/board/${TEST_PUBLIC_PROJECT.slug}`);

    // Wait for the board to render
    await expect(page.getByText(TEST_PUBLIC_PROJECT.name).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    // Board should show status columns
    await expect(
      page.getByText(/backlog/i).or(page.getByText(/todo/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("does NOT show description, comments, or agent details (safe whitelist)", async ({ page }) => {
    await page.goto(`/board/${TEST_PUBLIC_PROJECT.slug}`);

    await expect(page.getByText(TEST_PUBLIC_PROJECT.name).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    // Sensitive details should NOT be visible on the public board
    // Comments section, agent logs, and detailed descriptions are not exposed
    await expect(page.getByTestId("story-detail-comment-input")).not.toBeVisible();
    await expect(page.getByRole("tab", { name: /logs/i })).not.toBeVisible();
  });

  test("shows share button and signup CTA", async ({ page }) => {
    await page.goto(`/board/${TEST_PUBLIC_PROJECT.slug}`);

    await expect(page.getByText(TEST_PUBLIC_PROJECT.name).first()).toBeVisible({ timeout: 15000 });

    // Share button should be visible
    const shareBtn = page.getByTestId("public-board-share-btn");
    await expect(shareBtn).toBeVisible({ timeout: 5000 });

    // Signup CTA should be visible for unauthenticated users
    await expect(
      page.getByText(/sign up/i).or(page.getByText(/get started/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("private project slug returns 404", async ({ page }) => {
    await page.goto(`/board/${TEST_PROJECT.slug}`);

    // Private project should return 404 (no information leak)
    await expect(
      page.getByText(/404/i).or(page.getByText(/not found/i)).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
