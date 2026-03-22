import type { Page, Locator } from "@playwright/test";

export class QuickCapturePage {
  readonly page: Page;
  readonly input: Locator;
  readonly rewriteButton: Locator;
  readonly createButton: Locator;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.getByTestId("quick-capture-input");
    this.rewriteButton = page.getByTestId("rewrite-ai-btn");
    this.createButton = page.getByTestId("quick-capture-create-btn");
    this.dialog = page.getByRole("dialog");
  }

  /**
   * Opens Quick Capture via Cmd+K → Command Palette → "Create Story"
   * Cmd+K opens the CommandPalette dialog first; we then select "Create Story".
   */
  async open() {
    await this.page.keyboard.press("Meta+k");
    // Command palette opens as a dialog
    const cmdDialog = this.page.getByRole("dialog");
    await cmdDialog.waitFor({ state: "visible", timeout: 5000 });
    // Click "Create Story" option within the command palette
    await cmdDialog.getByText("Create Story").click();
    // Quick Capture dialog should now be open
    await this.input.waitFor({ state: "visible", timeout: 5000 });
  }

  async typeIdea(text: string) {
    await this.input.fill(text);
  }

  async clickRewrite() {
    await this.rewriteButton.click();
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async createStory(text: string) {
    await this.typeIdea(text);
    await this.clickCreate();
  }
}
