import type { Page, Locator } from "@playwright/test";

export class StoryModalPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly commentInput: Locator;
  readonly commentSubmit: Locator;
  readonly saveButton: Locator;
  readonly prioritySelect: Locator;
  /** Radix Sheet renders with role="dialog" and data-state="open" */
  readonly sheet: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByTestId("story-detail-title");
    this.descriptionInput = page.getByTestId("story-detail-description");
    this.commentInput = page.getByTestId("story-detail-comment-input");
    this.commentSubmit = page.getByTestId("story-detail-comment-submit");
    this.saveButton = page.getByTestId("story-detail-save");
    this.prioritySelect = page.getByTestId("story-detail-priority");
    // Radix Sheet uses role="dialog" with data-state="open"
    this.sheet = page.locator("[role='dialog'][data-state='open']");
  }

  async waitForOpen() {
    await this.sheet.waitFor({ state: "visible", timeout: 5000 });
  }

  async editTitle(newTitle: string) {
    await this.titleInput.clear();
    await this.titleInput.fill(newTitle);
  }

  async editDescription(newDescription: string) {
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
  }

  async save() {
    await this.saveButton.click();
  }

  async addComment(text: string) {
    await this.switchTab("comments");
    await this.commentInput.waitFor({ state: "visible", timeout: 3000 });
    await this.commentInput.fill(text);
    await this.commentSubmit.click();
  }

  /**
   * Switch to a tab in the story detail modal.
   * Tab values: "details", "criteria", "deps", "comments", "files", "logs", "diff", "claude"
   *
   * Some tabs (comments, files) are icon-only — no text to match by name.
   * We try text-based matching first, then fall back to nth-index in the tab list.
   */
  async switchTab(tabName: string) {
    const lowerName = tabName.toLowerCase();

    // For text-based tabs, try matching by accessible name
    // These tabs have visible text: Details, Criteria, Deps, Logs, Diff, Claude
    const tab = this.sheet.getByRole("tab", { name: new RegExp(tabName, "i") });
    if (await tab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tab.click();
      return;
    }

    // For icon-only tabs (comments, files), use nth-index in the tab list.
    // Tab order: Details(0), Criteria(1), Deps(2), Comments(3), Files(4), [Logs], [Diff], Claude(last)
    const indexMap: Record<string, number> = { comments: 3, files: 4 };
    const idx = indexMap[lowerName];
    if (idx !== undefined) {
      const allTabs = this.sheet.locator("[role='tab']");
      await allTabs.nth(idx).click();
    }
  }

  async changePriority(priority: string) {
    await this.prioritySelect.click();
    await this.page.getByRole("option", { name: priority }).click();
  }

  async close() {
    await this.page.keyboard.press("Escape");
  }
}
