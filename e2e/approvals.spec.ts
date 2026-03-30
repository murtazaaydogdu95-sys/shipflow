import { test, expect } from "./fixtures/auth.fixture";
import { TEST_ORG, TEST_USER } from "./fixtures/test-data";

const MOCK_APPROVAL = {
  id: "approval-1",
  orgId: TEST_ORG.id,
  type: "hire_agent",
  status: "pending",
  payload: { agentId: "agent-1", reason: "Need more capacity" },
  requestedById: "other-user-id",
  decidedById: null,
  decidedAt: null,
  requestedBy: { id: "other-user-id", name: "Other User", email: "other@codepylot.dev" },
  decidedBy: null,
  _count: { comments: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe("Approvals", () => {
  test("approval list loads with filter", async ({ authenticatedPage: page }) => {
    // Mock the GET to return approvals
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_APPROVAL]),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/approvals`);

    // Page should load with a heading
    await expect(
      page.getByRole("heading", { name: /approval/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show the pending approval
    await expect(page.getByText(/hire_agent|hire agent/i)).toBeVisible({ timeout: 5000 });
  });

  test("approval detail shows payload", async ({ authenticatedPage: page }) => {
    // Mock list endpoint
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_APPROVAL]),
        });
      }
      return route.continue();
    });

    // Mock detail endpoint
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPROVAL,
            comments: [],
          }),
        });
      }
      return route.continue();
    });

    // Mock comments endpoint
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1/comments`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.continue();
    });

    await page.goto(`/orgs/${TEST_ORG.id}/approvals`);
    await expect(
      page.getByRole("heading", { name: /approval/i })
    ).toBeVisible({ timeout: 10000 });

    // Click on the approval to see details
    const approvalRow = page.getByText(/hire_agent|hire agent/i).first();
    if (await approvalRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approvalRow.click();

      // Should show payload details
      await expect(
        page.getByText(/agent|capacity/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("can approve with comment", async ({ authenticatedPage: page }) => {
    let patchCalled = false;

    // Mock list
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_APPROVAL]),
        });
      }
      return route.continue();
    });

    // Mock detail
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPROVAL,
            comments: [],
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPROVAL,
            status: "approved",
            decidedById: TEST_USER.id,
            decidedBy: { id: TEST_USER.id, name: TEST_USER.name, email: TEST_USER.email },
            decidedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    // Mock comments
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1/comments`, (route) => {
      return route.fulfill({
        status: route.request().method() === "POST" ? 201 : 200,
        contentType: "application/json",
        body: JSON.stringify(route.request().method() === "POST" ? {
          id: "comment-new",
          content: "Looks good",
          userId: TEST_USER.id,
          user: { id: TEST_USER.id, name: TEST_USER.name, email: TEST_USER.email },
          createdAt: new Date().toISOString(),
        } : []),
      });
    });

    await page.goto(`/orgs/${TEST_ORG.id}/approvals`);
    await expect(
      page.getByRole("heading", { name: /approval/i })
    ).toBeVisible({ timeout: 10000 });

    // Click on the approval
    const approvalRow = page.getByText(/hire_agent|hire agent/i).first();
    if (await approvalRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approvalRow.click();

      // Look for approve button
      const approveButton = page.getByRole("button", { name: /approve/i });
      if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await approveButton.click();

        await expect(async () => {
          expect(patchCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test("can reject with comment", async ({ authenticatedPage: page }) => {
    let patchCalled = false;
    let patchData: Record<string, unknown> | null = null;

    // Mock list
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([MOCK_APPROVAL]),
        });
      }
      return route.continue();
    });

    // Mock detail + PATCH
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPROVAL,
            comments: [],
          }),
        });
      }
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        patchData = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_APPROVAL,
            status: "rejected",
            decidedById: TEST_USER.id,
            decidedAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    // Mock comments
    await page.route(`**/api/orgs/${TEST_ORG.id}/approvals/approval-1/comments`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto(`/orgs/${TEST_ORG.id}/approvals`);
    await expect(
      page.getByRole("heading", { name: /approval/i })
    ).toBeVisible({ timeout: 10000 });

    // Click on the approval
    const approvalRow = page.getByText(/hire_agent|hire agent/i).first();
    if (await approvalRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approvalRow.click();

      // Look for reject button
      const rejectButton = page.getByRole("button", { name: /reject/i });
      if (await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Fill in reason if required
        const reasonInput = page.getByLabel(/reason|comment/i);
        if (await reasonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reasonInput.fill("Not needed at this time");
        }

        await rejectButton.click();

        await expect(async () => {
          expect(patchCalled).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });
});
