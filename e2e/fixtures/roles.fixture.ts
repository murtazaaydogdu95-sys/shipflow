/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from "@playwright/test";
import path from "path";

type RoleFixtures = {
  adminPage: Page;
  memberPage: Page;
  unauthenticatedPage: Page;
};

export const test = base.extend<RoleFixtures>({
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(__dirname, "../.auth/admin.json"),
    });
    const page = await context.newPage();
    await page.request.get(`${baseURL}/api/health`).catch(() => {});
    await use(page);
    await page.goto("about:blank").catch(() => {});
    await context.close();
  },
  memberPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(__dirname, "../.auth/member.json"),
    });
    const page = await context.newPage();
    await page.request.get(`${baseURL}/api/health`).catch(() => {});
    await use(page);
    await page.goto("about:blank").catch(() => {});
    await context.close();
  },
  unauthenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
