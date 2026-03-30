# E2E Test Architecture -- Expanded Plan

**Author**: Architect
**Date**: 2026-03-26
**Status**: Ready for Coder implementation

---

## 1. Current State Summary

### Existing Coverage (12 spec files)

| File | Tests | Covers |
|------|-------|--------|
| auth.spec.ts | 6 | Login form, credentials, redirects, session persistence, forgot-password link, GitHub button |
| board.spec.ts | 7 | Columns, story cards, icebox toggle, card click, keyboard nav, drag-drop, poll |
| story-detail.spec.ts | 7 | Modal open, fields display, title edit, priority change, acceptance criteria, diff tab, agent controls |
| quick-capture.spec.ts | ~3 | Cmd+K open, type idea, create story |
| comments.spec.ts | ~3 | Add comment, display comments, delete comment |
| sprints.spec.ts | ~3 | List sprints, create sprint, change status |
| settings.spec.ts | 6 | Load settings, edit name, auto-assign toggle, AI provider, webhook add, Claude integration |
| dashboard.spec.ts | 5 | Project list, project cards, create project, navigate to project, usage info |
| ai-rewrite.spec.ts | ~2 | AI rewrite button, rewrite flow |
| agent.spec.ts | 5 | Trigger agent, status badge, logs tab, auto-refresh logs, revert button |
| bulk-operations.spec.ts | 6 | Toggle bulk mode, selection state, multi-select, bulk status change, bulk priority, bulk delete, escape |
| export.spec.ts | 3 | JSON export, CSV export, export button visible |

### Existing Infrastructure

- **6 Page Objects**: LoginPage, BoardPage, StoryModalPage, SettingsPage, SprintsPage, QuickCapturePage
- **1 Custom Fixture**: `authenticatedPage` (wraps default page with health check + cleanup)
- **1 Auth Setup**: Logs in `test@codepylot.dev`, saves storageState
- **1 Global Setup**: Prisma db push + seed
- **1 Seed File**: Creates 1 user (OWNER), 1 org (PRO), 1 project, 9 stories, 3 labels, 2 sprints, 1 dependency, 1 comment, 2 acceptance criteria
- **2 Helper Files**: mock-api.ts (mockApiRoute/mockApiError), mock-session.ts (auth/unauth session mocks)
- **1 API Handlers File**: setupBoardHandlers, setupStoryDetailHandlers, setupSettingsHandlers, setupSprintHandlers
- **1 Test Data File**: TEST_USER, TEST_ORG, TEST_PROJECT, TEST_STORIES, TEST_SPRINT, TEST_LABELS, makeStory()

### Established Patterns

1. **Read-through / Write-mock**: GET requests hit the real seeded DB; POST/PATCH/DELETE are mocked via `page.route()` to prevent mutations.
2. **Error boundary retry**: Page objects retry up to 3 times on "Something went wrong" screens.
3. **SWR settle wait**: 500ms `waitForTimeout` after board loads to avoid detached elements during SWR re-render.
4. **Fresh context for auth tests**: `test.use({ storageState: { cookies: [], origins: [] } })` to test login flows.
5. **API verification**: `patchCalled` boolean pattern with `expect().toPass()` polling.

---

## 2. Gap Analysis

### Flows NOT covered by existing tests

| Area | Missing Coverage | Priority |
|------|-----------------|----------|
| **Onboarding** | First-time user flow, org creation, project creation wizard | HIGH |
| **Password Reset** | Forgot password form, reset token flow, new password submission | MEDIUM |
| **2FA (TOTP)** | Enable 2FA, QR scan, verify code, login with 2FA, disable 2FA | HIGH |
| **Org Management** | Create org, switch org, edit org settings, delete org | HIGH |
| **Org Invites** | Send invite, accept invite, revoke invite, invite link | HIGH |
| **RBAC** | MEMBER cannot access settings, ADMIN can manage members but not billing, OWNER full access | HIGH |
| **Project CRUD** | Edit project, delete project, archive, project slug uniqueness | MEDIUM |
| **Story Transitions** | Valid state transitions (BACKLOG->TODO->IN_PROGRESS->REVIEW->DONE), invalid transitions blocked, review gate enforcement | HIGH |
| **Story Dependencies** | View deps tab, add/remove dependency, blocked indicator on card | MEDIUM |
| **Saved Filters** | Create filter, apply filter, delete filter, filter persistence | LOW |
| **Webhooks** | Webhook CRUD in settings, delivery list, retry delivery, dead letter queue | LOW |
| **Account Settings** | Profile edit, email change, password change, notification preferences, delete account | MEDIUM |
| **Public Board** | Toggle public, view public board (no auth), verify safe field whitelist, private board 404 | HIGH |
| **Agent Review** | Review gate (must view diff before approve), confirm-review API, approve/reject/revert flow | HIGH |
| **Empty States** | No projects dashboard, no stories board, no sprints, no comments, no members | LOW |
| **Error Handling** | API 500 responses, network offline, rate limiting, 404 pages | MEDIUM |
| **Navigation** | Sidebar links, breadcrumbs, back button behavior, deep linking | LOW |
| **Theme** | Dark/light mode toggle, persistence across reload | LOW |
| **Security/Abuse** | XSS in story title/description, IDOR (access other org's project), CSRF, auth bypass attempts | HIGH |

---

## 3. Expanded Folder Structure

```
e2e/
  .auth/
    user.json              (existing - OWNER auth state)
    admin.json             (NEW - ADMIN auth state)
    member.json            (NEW - MEMBER auth state)

  fixtures/
    auth.fixture.ts        (existing - authenticatedPage)
    test-data.ts           (existing - expand with new constants)
    api-handlers.ts        (existing - expand with new handlers)
    roles.fixture.ts       (NEW - adminPage, memberPage fixtures)

  helpers/
    mock-api.ts            (existing)
    mock-session.ts        (existing)
    api-client.ts          (NEW - direct API calls for test setup/teardown)
    wait-helpers.ts        (NEW - reusable wait utilities)

    page-objects/
      login.page.ts        (existing)
      board.page.ts        (existing)
      story-modal.page.ts  (existing)
      settings.page.ts     (existing)
      sprints.page.ts      (existing)
      quick-capture.page.ts (existing)
      dashboard.page.ts    (NEW)
      onboarding.page.ts   (NEW)
      account.page.ts      (NEW)
      org-settings.page.ts (NEW)
      org-members.page.ts  (NEW)
      public-board.page.ts (NEW)
      forgot-password.page.ts (NEW)
      two-factor.page.ts   (NEW)

  # Existing specs (unchanged)
  auth.setup.ts
  global-setup.ts
  seed-test-db.ts
  auth.spec.ts
  board.spec.ts
  story-detail.spec.ts
  quick-capture.spec.ts
  comments.spec.ts
  sprints.spec.ts
  settings.spec.ts
  dashboard.spec.ts
  ai-rewrite.spec.ts
  agent.spec.ts
  bulk-operations.spec.ts
  export.spec.ts

  # New specs
  onboarding.spec.ts
  password-reset.spec.ts
  two-factor-auth.spec.ts
  org-management.spec.ts
  org-invites.spec.ts
  rbac.spec.ts
  project-crud.spec.ts
  story-transitions.spec.ts
  story-dependencies.spec.ts
  saved-filters.spec.ts
  webhooks.spec.ts
  account-settings.spec.ts
  public-board.spec.ts
  agent-review.spec.ts
  empty-states.spec.ts
  error-handling.spec.ts
  navigation.spec.ts
  theme.spec.ts
  security-abuse.spec.ts
```

---

## 4. Page Object Model Design

All new page objects follow the existing pattern: constructor receives `Page`, exposes `Locator` properties, and includes a `goto()` method with error-boundary retry logic.

### 4.1 DashboardPage (NEW)

```typescript
// e2e/helpers/page-objects/dashboard.page.ts
import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly projectsHeading: Locator;
  readonly createProjectBtn: Locator;
  readonly projectCreateDialog: Locator;
  readonly usageSection: Locator;
  readonly orgSwitcher: Locator;

  constructor(page: Page) {
    this.page = page;
    this.projectsHeading = page.getByRole("heading", { name: "Projects" });
    this.createProjectBtn = page.getByTestId("create-project-btn");
    this.projectCreateDialog = page.getByRole("dialog");
    this.usageSection = page.getByTestId("dashboard-usage-section");
    this.orgSwitcher = page.getByTestId("org-switcher");
  }

  async goto() { /* navigate to /dashboard with retry */ }
  getProjectCard(slug: string): Locator { /* getByTestId */ }
  async createProject(name: string, description: string, techStack: string) { /* dialog flow */ }
  async switchOrg(orgName: string) { /* click org switcher, select */ }
}
```

### 4.2 OnboardingPage (NEW)

```typescript
// e2e/helpers/page-objects/onboarding.page.ts
export class OnboardingPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly orgNameInput: Locator;
  readonly continueButton: Locator;
  readonly skipButton: Locator;
  readonly stepIndicator: Locator;

  async goto() { /* /onboarding */ }
  async fillOrgName(name: string) { /* fill input */ }
  async continue() { /* click continue */ }
  async skip() { /* click skip */ }
  async completeOnboarding(orgName: string, projectName: string) { /* full flow */ }
}
```

### 4.3 AccountPage (NEW)

```typescript
// e2e/helpers/page-objects/account.page.ts
export class AccountPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly saveButton: Locator;
  readonly changePasswordBtn: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly deleteAccountBtn: Locator;
  readonly twoFactorSection: Locator;

  async gotoProfile() { /* /account/profile */ }
  async gotoSecurity() { /* /account/security */ }
  async gotoNotifications() { /* /account/notifications */ }
  async editProfile(name: string, email?: string) { /* edit flow */ }
  async changePassword(current: string, newPass: string) { /* password change flow */ }
}
```

### 4.4 OrgSettingsPage (NEW)

```typescript
// e2e/helpers/page-objects/org-settings.page.ts
export class OrgSettingsPage {
  readonly page: Page;
  readonly orgNameInput: Locator;
  readonly saveButton: Locator;
  readonly planBadge: Locator;
  readonly deleteOrgBtn: Locator;
  readonly launchDateInput: Locator;

  async goto() { /* /org/settings */ }
  async editOrgName(name: string) { /* fill + save */ }
}
```

### 4.5 OrgMembersPage (NEW)

```typescript
// e2e/helpers/page-objects/org-members.page.ts
export class OrgMembersPage {
  readonly page: Page;
  readonly inviteEmailInput: Locator;
  readonly inviteRoleSelect: Locator;
  readonly inviteButton: Locator;
  readonly membersTable: Locator;
  readonly pendingInvitesList: Locator;

  async goto() { /* /org/members */ }
  async inviteMember(email: string, role: "ADMIN" | "MEMBER") { /* invite flow */ }
  getMemberRow(email: string): Locator { /* locator for member row */ }
  async changeRole(email: string, newRole: string) { /* role change */ }
  async removeMember(email: string) { /* remove flow */ }
}
```

### 4.6 PublicBoardPage (NEW)

```typescript
// e2e/helpers/page-objects/public-board.page.ts
export class PublicBoardPage {
  readonly page: Page;
  readonly boardTitle: Locator;
  readonly shareButton: Locator;
  readonly signupCta: Locator;
  readonly columns: Locator;

  async goto(slug: string) { /* /board/{slug} */ }
  getColumn(status: string): Locator { /* column locator */ }
  getStoryCard(shortId: string): Locator { /* card locator */ }
}
```

### 4.7 ForgotPasswordPage (NEW)

```typescript
// e2e/helpers/page-objects/forgot-password.page.ts
export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly backToLoginLink: Locator;

  async goto() { /* /forgot-password */ }
  async requestReset(email: string) { /* fill + submit */ }
}
```

### 4.8 TwoFactorPage (NEW)

```typescript
// e2e/helpers/page-objects/two-factor.page.ts
export class TwoFactorPage {
  readonly page: Page;
  readonly qrCode: Locator;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  readonly enableButton: Locator;
  readonly disableButton: Locator;

  async gotoSetup() { /* /account/security */ }
  async gotoVerify() { /* /verify-2fa */ }
  async enterCode(code: string) { /* fill + submit */ }
}
```

---

## 5. Custom Fixtures Design

### 5.1 Expanded auth.fixture.ts

The existing `authenticatedPage` fixture stays as-is. Add role-based fixtures.

```typescript
// e2e/fixtures/roles.fixture.ts
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
```

### 5.2 Auth Setup for Additional Roles

Expand `auth.setup.ts` to also log in as admin and member users.

```typescript
// In auth.setup.ts, add after existing "authenticate" test:

setup("authenticate-admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("admin@codepylot.dev");
  await page.getByTestId("login-password").fill("adminpassword123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.context().storageState({ path: adminAuthFile });
});

setup("authenticate-member", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("member@codepylot.dev");
  await page.getByTestId("login-password").fill("memberpassword123");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.context().storageState({ path: memberAuthFile });
});
```

### 5.3 Seed Expansion

Expand `seed-test-db.ts` to create:

```typescript
// Additional test users
const adminUser = await prisma.user.create({
  data: {
    id: "test-admin-id",
    name: "Admin User",
    email: "admin@codepylot.dev",
    passwordHash: hashSync("adminpassword123", 10),
    isAdmin: false,
    onboardingCompleted: true,
  },
});

const memberUser = await prisma.user.create({
  data: {
    id: "test-member-id",
    name: "Member User",
    email: "member@codepylot.dev",
    passwordHash: hashSync("memberpassword123", 10),
    isAdmin: false,
    onboardingCompleted: true,
  },
});

// An unboarded user for onboarding tests
const newUser = await prisma.user.create({
  data: {
    id: "test-new-user-id",
    name: "New User",
    email: "newuser@codepylot.dev",
    passwordHash: hashSync("newuserpassword123", 10),
    isAdmin: false,
    onboardingCompleted: false,  // <-- triggers onboarding
  },
});

// Add admin and member to the org
await prisma.orgMember.create({
  data: { userId: adminUser.id, orgId: org.id, role: "ADMIN" },
});
await prisma.orgMember.create({
  data: { userId: memberUser.id, orgId: org.id, role: "MEMBER" },
});

// Update currentOrgId for both
await prisma.user.update({ where: { id: adminUser.id }, data: { currentOrgId: org.id } });
await prisma.user.update({ where: { id: memberUser.id }, data: { currentOrgId: org.id } });

// Add admin + member as project members
await prisma.projectMember.create({
  data: { userId: adminUser.id, projectId: project.id, role: "ADMIN" },
});
await prisma.projectMember.create({
  data: { userId: memberUser.id, projectId: project.id, role: "MEMBER" },
});

// Create a second org for org-switching tests
const secondOrg = await prisma.organization.create({
  data: {
    id: "test-org-2-id",
    name: "Second Workspace",
    slug: "second-workspace",
    plan: "FREE",
    isPersonal: false,
  },
});
await prisma.orgMember.create({
  data: { userId: user.id, orgId: secondOrg.id, role: "OWNER" },
});

// Create a public project for public board tests
const publicProject = await prisma.project.create({
  data: {
    id: "test-public-project-id",
    name: "Public Project",
    slug: "public-project",
    description: "A publicly visible project",
    isPublic: true,
    orgId: org.id,
  },
});
await prisma.projectMember.create({
  data: { userId: user.id, projectId: publicProject.id, role: "OWNER" },
});
// Add a few stories to the public project
await prisma.story.create({
  data: {
    id: "story-public-1",
    shortId: "PB-001",
    title: "Public board feature",
    status: "TODO",
    priority: "HIGH",
    type: "feature",
    position: 0,
    projectId: publicProject.id,
  },
});

// Create a story with reviewedAt set for agent-review tests
// (story-review-1 already exists, update it)
await prisma.story.update({
  where: { id: "story-review-1" },
  data: {
    reviewedAt: null,     // NOT reviewed yet -- tests the gate
    reviewedBy: null,
  },
});
```

### 5.4 Test Data Constants Expansion

Add to `test-data.ts`:

```typescript
export const TEST_ADMIN_USER = {
  id: "test-admin-id",
  name: "Admin User",
  email: "admin@codepylot.dev",
  password: "adminpassword123",
  orgId: "test-org-id",
} as const;

export const TEST_MEMBER_USER = {
  id: "test-member-id",
  name: "Member User",
  email: "member@codepylot.dev",
  password: "memberpassword123",
  orgId: "test-org-id",
} as const;

export const TEST_NEW_USER = {
  id: "test-new-user-id",
  name: "New User",
  email: "newuser@codepylot.dev",
  password: "newuserpassword123",
} as const;

export const TEST_ORG_2 = {
  id: "test-org-2-id",
  name: "Second Workspace",
  slug: "second-workspace",
  plan: "FREE",
} as const;

export const TEST_PUBLIC_PROJECT = {
  id: "test-public-project-id",
  name: "Public Project",
  slug: "public-project",
  description: "A publicly visible project",
} as const;
```

---

## 6. Helper Utilities

### 6.1 API Client (NEW)

Direct API calls for test setup/teardown, bypassing UI. This avoids slow UI interactions for precondition setup.

```typescript
// e2e/helpers/api-client.ts
import type { APIRequestContext } from "@playwright/test";

export class TestApiClient {
  constructor(private request: APIRequestContext, private baseURL: string) {}

  async createStory(projectId: string, data: Record<string, unknown>) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects/${projectId}/stories`,
      { data }
    );
    return resp.json();
  }

  async updateStory(projectId: string, storyId: string, data: Record<string, unknown>) {
    const resp = await this.request.patch(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}`,
      { data }
    );
    return resp.json();
  }

  async deleteStory(projectId: string, storyId: string) {
    await this.request.delete(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}`
    );
  }

  async confirmReview(projectId: string, storyId: string) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects/${projectId}/stories/${storyId}/confirm-review`
    );
    return resp.json();
  }

  async createProject(data: Record<string, unknown>) {
    const resp = await this.request.post(
      `${this.baseURL}/api/projects`,
      { data }
    );
    return resp.json();
  }

  async inviteMember(orgId: string, email: string, role: string) {
    const resp = await this.request.post(
      `${this.baseURL}/api/orgs/${orgId}/invites`,
      { data: { email, role } }
    );
    return resp.json();
  }
}
```

### 6.2 Wait Helpers (NEW)

```typescript
// e2e/helpers/wait-helpers.ts
import type { Page, Locator } from "@playwright/test";

/**
 * Wait for a toast notification (sonner) containing specific text.
 */
export async function waitForToast(page: Page, text: string | RegExp, timeout = 5000) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: text });
  await toast.waitFor({ state: "visible", timeout });
  return toast;
}

/**
 * Wait for a network request to complete and return its response.
 */
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

/**
 * Dismiss any visible toast notifications.
 */
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
```

---

## 7. New Spec Files -- Detailed Design

### 7.1 onboarding.spec.ts

**Preconditions**: Use `test-new-user-id` who has `onboardingCompleted: false`.
**Auth strategy**: Fresh browser context, log in as new user.

| Test | Description |
|------|-------------|
| redirects to /onboarding when onboardingCompleted is false | Login as new user, verify redirect |
| displays welcome heading and org name input | Check onboarding form elements |
| creates org and continues to project creation step | Fill org name, continue |
| completes full onboarding flow | Org name -> project name -> redirects to dashboard |
| skip button skips current step | Click skip, verify progress |

### 7.2 password-reset.spec.ts

**Auth strategy**: Unauthenticated (fresh context).
**Note**: Email delivery cannot be tested E2E; test the form submission and UI feedback.

| Test | Description |
|------|-------------|
| displays forgot password form | Navigate to /forgot-password, verify form |
| submits email and shows success message | Fill email, submit, verify feedback |
| shows error for non-existent email | Submit unknown email, verify error |
| back to login link works | Click link, verify redirect to /login |
| reset password form validates password match | Navigate to /reset-password?token=..., test validation |

### 7.3 two-factor-auth.spec.ts

**Auth strategy**: Authenticated as test user.
**Note**: TOTP code generation requires mocking. Mock the `/api/auth/2fa/setup` and `/api/auth/2fa/verify` endpoints.

| Test | Description |
|------|-------------|
| shows 2FA setup option in security settings | Navigate to /account/security, verify section |
| displays QR code when enabling 2FA | Click enable, verify QR code display |
| verifies TOTP code and enables 2FA | Mock verify endpoint, submit code |
| shows 2FA verification page during login | Mock session requiring 2FA, verify /verify-2fa page |
| disables 2FA with password confirmation | Mock disable endpoint |

### 7.4 org-management.spec.ts

| Test | Description |
|------|-------------|
| displays org settings page | Navigate, verify org name input |
| edits org name and saves | Change name, mock PATCH, verify |
| shows current plan badge | Verify PRO plan display |
| org switcher shows all orgs | Click switcher, verify both orgs listed |
| switches active org | Select second org, verify switch |
| shows org audit log | Navigate to /org/audit-log, verify table |

### 7.5 org-invites.spec.ts

| Test | Description |
|------|-------------|
| displays members page with current members | Navigate to /org/members, verify table |
| sends invite to new email | Fill invite form, mock POST, verify |
| shows pending invites list | Verify pending invite display |
| revokes pending invite | Click revoke, confirm, verify removal |
| prevents duplicate invite | Submit same email, verify error |
| invite page renders for invited user | Navigate to /invite?token=..., verify |

### 7.6 rbac.spec.ts

**Uses**: `adminPage` and `memberPage` fixtures.

| Test | Description |
|------|-------------|
| MEMBER can view board | memberPage navigates to board, sees stories |
| MEMBER cannot access project settings | memberPage navigates to settings, gets redirected or 403 |
| MEMBER cannot delete stories | memberPage tries delete, verify blocked |
| ADMIN can access project settings | adminPage navigates to settings, can edit |
| ADMIN cannot manage billing | adminPage navigates to billing, verify restricted |
| OWNER can access all settings | authenticatedPage (OWNER), verify full access |
| MEMBER cannot invite org members | memberPage navigates to /org/members, invite button hidden/disabled |

### 7.7 project-crud.spec.ts

| Test | Description |
|------|-------------|
| creates project from dashboard | Click create, fill form, verify redirect |
| edits project name in settings | Change name, save, verify |
| edits project description | Change description, save |
| edits tech stack | Change tech stack, save |
| toggles project public visibility | Click toggle, verify |
| shows public URL when public | Verify URL display after toggle |
| deletes project with confirmation | Click delete, confirm dialog, verify removal |

### 7.8 story-transitions.spec.ts

**Critical**: Tests the review gate enforcement.

| Test | Description |
|------|-------------|
| moves story BACKLOG -> TODO | Drag or button, verify column change |
| moves story TODO -> IN_PROGRESS | Transition, verify |
| moves story IN_PROGRESS -> REVIEW | Transition, verify |
| moves story REVIEW -> DONE (non-agent) | Manual story, no gate, verify |
| blocks REVIEW -> DONE for agent story without review | Mock 422 response, verify error message |
| allows REVIEW -> DONE after confirm-review | Call confirm-review API first, then transition |
| clears reviewedAt when moving away from REVIEW | Move from REVIEW back, verify cleared |
| blocks invalid transition (DONE -> BACKLOG) | Attempt invalid move, verify blocked |

### 7.9 story-dependencies.spec.ts

| Test | Description |
|------|-------------|
| shows deps tab in story detail | Open story, switch to Deps tab |
| displays existing dependency | story-todo-2 blocked by story-todo-1, verify display |
| shows blocked indicator on card | Verify blocked badge/icon on story card |
| adds a new dependency | Mock POST, add dependency, verify |
| removes a dependency | Mock DELETE, remove dependency, verify |

### 7.10 saved-filters.spec.ts

| Test | Description |
|------|-------------|
| applies priority filter | Filter by HIGH, verify only HIGH stories shown |
| applies label filter | Filter by frontend label |
| applies type filter | Filter by bug type |
| applies search text filter | Type search term, verify filtering |
| saves current filter | Name and save, verify persistence |
| loads saved filter | Select saved filter, verify applied |
| deletes saved filter | Remove saved filter |

### 7.11 webhooks.spec.ts

| Test | Description |
|------|-------------|
| displays webhooks section in settings | Verify section visible |
| adds webhook URL | Fill URL, submit, verify created |
| shows webhook in list after creation | Verify webhook appears |
| edits webhook URL | Change URL, save |
| deletes webhook | Click delete, confirm, verify removed |
| shows webhook deliveries list | Navigate to deliveries, verify table |

### 7.12 account-settings.spec.ts

| Test | Description |
|------|-------------|
| displays profile page | Navigate to /account/profile, verify fields |
| edits display name | Change name, save, verify |
| navigates to security page | Click security tab, verify page |
| navigates to notifications page | Click notifications tab, verify page |
| toggles notification preferences | Toggle switches, save |
| shows change password form | Verify form fields on security page |

### 7.13 public-board.spec.ts

**Auth strategy**: Unauthenticated for public board view tests.

| Test | Description |
|------|-------------|
| displays public board for public project | Navigate to /board/public-project, verify columns |
| shows stories with safe fields only | Verify title/shortId/status visible, description NOT visible |
| hides assignee and org details | Verify no user/org info leaked |
| shows signup CTA | Verify "Sign up" call-to-action |
| shows share button | Verify share button with copy URL |
| returns 404 for private project | Navigate to /board/test-project, verify 404 page |
| returns 404 for non-existent slug | Navigate to /board/fake-slug, verify 404 |

### 7.14 agent-review.spec.ts

**Critical**: Tests the trust gate enforcement.

| Test | Description |
|------|-------------|
| shows review panel for agent-completed story | Open review story, verify approve/reject buttons |
| approve button disabled before viewing diff | Verify button disabled when reviewedAt is null |
| clicking diff tab triggers confirm-review | Mock POST /confirm-review, click Diff tab, verify call |
| approve button enabled after confirm-review | After review confirmation, verify button enabled |
| approve transitions story to DONE | Click approve, mock PATCH, verify |
| reject sends feedback to agent | Click reject, fill feedback, submit |
| revert button reverts agent work | Click revert, confirm, verify |
| shows risk indicators in diff viewer | Mock diff with secrets/eval, verify risk badges |

### 7.15 empty-states.spec.ts

| Test | Description |
|------|-------------|
| shows empty state on dashboard with no projects | Mock empty project list, verify empty state message |
| shows empty board with no stories | Mock empty stories, verify empty columns message |
| shows empty sprint list | Mock no sprints, verify message |
| shows empty comments section | Open story with no comments, verify message |

### 7.16 error-handling.spec.ts

| Test | Description |
|------|-------------|
| shows error boundary on 500 response | Mock 500 for stories API, verify error boundary |
| shows retry button on error | Verify "Try again" button in error boundary |
| retry button recovers from error | Mock 500 then 200 on retry, verify recovery |
| shows 404 page for non-existent project | Navigate to /projects/fake-id, verify 404 |
| handles network timeout gracefully | Mock delayed response, verify loading then error |
| shows toast on API error during save | Mock 500 on PATCH, verify toast notification |

### 7.17 navigation.spec.ts

| Test | Description |
|------|-------------|
| sidebar shows all navigation links | Verify Projects, Activity, Dashboard, Settings links |
| navigates from dashboard to project | Click project, verify URL |
| navigates from project to settings | Click settings tab, verify |
| navigates from project to sprints | Click sprints tab, verify |
| navigates from project to analytics | Click analytics tab, verify |
| breadcrumbs show correct path | Verify breadcrumb text and links |
| back button returns to previous page | Navigate deep, press back, verify |

### 7.18 theme.spec.ts

| Test | Description |
|------|-------------|
| defaults to system theme | Verify no explicit theme class |
| toggles to dark mode | Click theme toggle, verify dark class on html |
| toggles back to light mode | Click again, verify light |
| persists theme across page reload | Set dark, reload, verify still dark |

### 7.19 security-abuse.spec.ts

**Auth strategy**: Mix of authenticated and unauthenticated.

| Test | Description |
|------|-------------|
| XSS in story title is escaped | Create story with `<script>` title, verify escaped rendering |
| XSS in comment is escaped | Add comment with script tag, verify escaped |
| cannot access other org's project via URL | Navigate to /projects/{other-org-project-id}, verify 403/404 |
| API rejects request without auth cookie | Direct API call without cookie, verify 401 |
| SQL injection in search is safe | Search with `'; DROP TABLE stories;--`, verify no error |
| rate limiting returns 429 | Rapid-fire requests, verify rate limit response |
| cannot enumerate user emails via login | Multiple login attempts, verify consistent error message |

---

## 8. playwright.config.ts Changes

### 8.1 Add auth setup projects for admin/member

```typescript
projects: [
  {
    name: "setup",
    testMatch: /auth\.setup\.ts/,
  },
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      storageState: path.resolve(__dirname, "e2e/.auth/user.json"),
    },
    dependencies: ["setup"],
    testIgnore: /auth\.setup\.ts/,
  },
  // No separate projects for admin/member -- they use browser.newContext()
  // in the roles.fixture.ts with explicit storageState paths.
],
```

The admin/member auth states are created in `auth.setup.ts` alongside the existing OWNER setup. No separate Playwright project is needed because `roles.fixture.ts` creates new browser contexts with explicit `storageState` paths.

### 8.2 Tag-based test grouping (optional)

Use Playwright's `@tag` annotations to allow selective runs:

```bash
# Run only critical path tests
npx playwright test --grep @critical

# Run only security tests
npx playwright test --grep @security

# Skip slow tests
npx playwright test --grep-invert @slow
```

Tags in spec files:
- `@critical`: auth, board, story-transitions, agent-review, rbac
- `@security`: security-abuse, rbac
- `@slow`: onboarding, full flows

---

## 9. New `data-testid` Selectors Required

The Coder must add these `data-testid` attributes to the corresponding source components.

### Dashboard / Layout
| Selector | Component | Purpose |
|----------|-----------|---------|
| `dashboard-usage-section` | projects-list.tsx or dashboard page | Usage/limits display section |
| `org-switcher` | layout/org-switcher.tsx | Org switcher dropdown trigger |
| `org-switcher-option-{slug}` | layout/org-switcher.tsx | Each org option in dropdown |
| `sidebar-nav-{name}` | layout/sidebar.tsx | Each sidebar nav item (projects, activity, etc.) |
| `breadcrumb-{segment}` | layout/breadcrumbs.tsx | Each breadcrumb segment |
| `theme-toggle` | layout/theme-toggle.tsx | Dark/light mode toggle button |

### Onboarding
| Selector | Component | Purpose |
|----------|-----------|---------|
| `onboarding-welcome` | onboarding/page.tsx | Welcome heading |
| `onboarding-org-name` | onboarding/page.tsx | Org name input |
| `onboarding-project-name` | onboarding/page.tsx | Project name input |
| `onboarding-continue` | onboarding/page.tsx | Continue/Next button |
| `onboarding-skip` | onboarding/page.tsx | Skip button |
| `onboarding-step-{n}` | onboarding/page.tsx | Step indicator |

### Account
| Selector | Component | Purpose |
|----------|-----------|---------|
| `account-name-input` | account/profile/page.tsx | Display name input |
| `account-email-input` | account/profile/page.tsx | Email display/input |
| `account-save-btn` | account/profile/page.tsx | Save profile button |
| `account-change-password-btn` | account/security/page.tsx | Change password trigger |
| `account-current-password` | account/security/page.tsx | Current password input |
| `account-new-password` | account/security/page.tsx | New password input |
| `account-confirm-password` | account/security/page.tsx | Confirm password input |
| `account-delete-btn` | account/profile/page.tsx | Delete account button |
| `account-2fa-section` | account/security/page.tsx | 2FA settings section |
| `account-2fa-enable` | account/security/page.tsx | Enable 2FA button |
| `account-2fa-disable` | account/security/page.tsx | Disable 2FA button |
| `notification-pref-{type}` | account/notifications/page.tsx | Each notification toggle |

### Org Settings
| Selector | Component | Purpose |
|----------|-----------|---------|
| `org-name-input` | org/settings/page.tsx | Org name input |
| `org-save-btn` | org/settings/page.tsx | Save org settings button |
| `org-plan-badge` | org/settings/page.tsx | Plan tier badge |
| `org-delete-btn` | org/settings/page.tsx | Delete org button |

### Org Members / Invites
| Selector | Component | Purpose |
|----------|-----------|---------|
| `invite-email-input` | org/members/page.tsx | Invite email input |
| `invite-role-select` | org/members/page.tsx | Invite role dropdown |
| `invite-send-btn` | org/members/page.tsx | Send invite button |
| `members-table` | org/members/page.tsx | Members table container |
| `member-row-{email}` | org/members/page.tsx | Each member row |
| `member-role-{email}` | org/members/page.tsx | Role badge/select per member |
| `member-remove-{email}` | org/members/page.tsx | Remove member button |
| `pending-invites-list` | org/members/page.tsx | Pending invites section |
| `invite-revoke-{email}` | org/members/page.tsx | Revoke invite button |

### Auth Pages
| Selector | Component | Purpose |
|----------|-----------|---------|
| `forgot-password-email` | forgot-password/page.tsx | Email input |
| `forgot-password-submit` | forgot-password/page.tsx | Submit button |
| `forgot-password-success` | forgot-password/page.tsx | Success message |
| `forgot-password-back` | forgot-password/page.tsx | Back to login link |
| `reset-password-input` | reset-password/page.tsx | New password input |
| `reset-password-confirm` | reset-password/page.tsx | Confirm password input |
| `reset-password-submit` | reset-password/page.tsx | Submit button |
| `verify-2fa-code` | verify-2fa/page.tsx | TOTP code input |
| `verify-2fa-submit` | verify-2fa/page.tsx | Verify button |
| `invite-accept-btn` | invite/page.tsx | Accept invite button |

### Public Board
| Selector | Component | Purpose |
|----------|-----------|---------|
| `public-board-title` | board/[slug]/page.tsx | Board project title |
| `public-board-signup-cta` | board/[slug]/page.tsx | Signup CTA button/link |
| `public-board-column-{status}` | board/[slug]/page.tsx | Column containers |
| `public-board-card-{shortId}` | board/[slug]/page.tsx | Story card (public) |

### Story / Board Additions
| Selector | Component | Purpose |
|----------|-----------|---------|
| `story-blocked-badge` | board/story-card.tsx | Blocked dependency indicator |
| `story-agent-badge` | board/story-card.tsx | Agent status badge on card |
| `story-deps-add-btn` | stories/story-deps.tsx | Add dependency button |
| `story-dep-row-{id}` | stories/story-deps.tsx | Each dependency row |
| `story-dep-remove-{id}` | stories/story-deps.tsx | Remove dependency button |
| `review-approve-btn` | stories/story-review-panel.tsx | Approve button |
| `review-reject-btn` | stories/story-review-panel.tsx | Reject/Request Changes button |
| `review-revert-btn` | stories/story-review-panel.tsx | Revert button |
| `review-feedback-input` | stories/story-review-panel.tsx | Rejection feedback textarea |
| `review-gate-warning` | stories/story-review-panel.tsx | "View diff first" warning |
| `diff-risk-badge-{type}` | stories/diff-viewer.tsx | Risk indicator badges |

### Filter / Search
| Selector | Component | Purpose |
|----------|-----------|---------|
| `board-filter-btn` | board/kanban-board.tsx | Open filter panel button |
| `filter-priority-select` | board/filter-panel.tsx | Priority filter dropdown |
| `filter-label-select` | board/filter-panel.tsx | Label filter dropdown |
| `filter-type-select` | board/filter-panel.tsx | Type filter dropdown |
| `filter-search-input` | board/kanban-board.tsx | Search text input |
| `filter-save-btn` | board/filter-panel.tsx | Save current filter |
| `saved-filter-{id}` | board/filter-panel.tsx | Saved filter item |
| `saved-filter-delete-{id}` | board/filter-panel.tsx | Delete saved filter |

### Project Settings Additions
| Selector | Component | Purpose |
|----------|-----------|---------|
| `settings-delete-project-btn` | settings/page.tsx | Delete project button |
| `settings-tech-stack` | settings/page.tsx | Tech stack input |
| `settings-description` | settings/page.tsx | Description textarea |

### Error / Empty States
| Selector | Component | Purpose |
|----------|-----------|---------|
| `empty-state-{context}` | Various | Empty state containers (e.g., `empty-state-projects`, `empty-state-stories`) |
| `error-boundary` | error.tsx | Error boundary container |
| `error-retry-btn` | error.tsx | Retry button in error boundary |
| `not-found-page` | not-found.tsx | 404 page container |

---

## 10. Test Data Strategy

### Principles

1. **Seed once, mock writes**: The global setup seeds the database once. All write operations (POST/PATCH/DELETE) are mocked via `page.route()` to prevent test-to-test interference.

2. **No test-to-test dependencies**: Tests must NOT depend on side effects from other tests. Each test assumes the seeded baseline state.

3. **API client for complex preconditions**: When a test needs state beyond the baseline (e.g., a story in a specific status), use the `TestApiClient` to set up via API before the test, OR mock the GET responses.

4. **Deterministic IDs**: All seeded entities use predictable string IDs (`test-user-id`, `story-todo-1`, etc.) so tests can reference them directly.

### Data Isolation

Since `workers: 1` (serial execution) and writes are mocked, there is no parallelism concern. If we later increase workers, each worker would need its own database -- this is a future consideration, not needed now.

### Cleanup

- `seed-test-db.ts` runs `deleteMany()` on all tables in dependency order before seeding.
- This ensures a clean slate on every `npx playwright test` run.
- No per-test cleanup is needed because writes are mocked.

---

## 11. Environment Variables (.env.test)

Ensure the following are set:

```env
DATABASE_URL=postgresql://codepylot:codepylot@localhost:5432/codepylot_test
AUTH_SECRET=e2e-test-secret-at-least-32-chars-long-for-nextauth
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=http://localhost:3001
OLLAMA_URL=http://localhost:11434/v1
CRON_SECRET=test-cron-secret
ENCRYPTION_KEY=e2e-test-encryption-key-32chars!
NODE_ENV=development
# Disable real OAuth in tests
AUTH_GITHUB_ID=test-github-id
AUTH_GITHUB_SECRET=test-github-secret
AUTH_GOOGLE_ID=test-google-id
AUTH_GOOGLE_SECRET=test-google-secret
# Disable real email sending
RESEND_API_KEY=re_test_fake_key
# Disable PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## 12. CI Integration

### GitHub Actions Workflow

The existing config (`reporter: [["github"], ["html"]]` in CI) is correct. Ensure the workflow includes:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: codepylot
          POSTGRES_PASSWORD: codepylot
          POSTGRES_DB: codepylot_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npx prisma generate
      - run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true
          DATABASE_URL: postgresql://codepylot:codepylot@localhost:5432/codepylot_test
          AUTH_SECRET: e2e-test-secret-at-least-32-chars-long-for-nextauth
          AUTH_TRUST_HOST: "true"
          CRON_SECRET: test-cron-secret
          ENCRYPTION_KEY: e2e-test-encryption-key-32chars!

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
          retention-days: 7
```

### CI-specific Settings (already in playwright.config.ts)

- `retries: 2` in CI (vs 3 local)
- `reuseExistingServer: false` in CI
- `forbidOnly: true` in CI

---

## 13. Screenshot / Trace Strategy

Already configured in `playwright.config.ts`:

| Artifact | When Captured | Purpose |
|----------|--------------|---------|
| Screenshot | `only-on-failure` | Debug failing tests |
| Video | `on-first-retry` | See what happened before failure |
| Trace | `on-first-retry` | Full DOM snapshot + network logs for debugging |

These settings are optimal. No changes needed.

**Storage**: CI artifacts are uploaded via `actions/upload-artifact`. Local artifacts go to `test-results/` (gitignored).

---

## 14. Risks and Tradeoffs

### What is Hard to Test

| Area | Challenge | Mitigation |
|------|-----------|------------|
| **OAuth (GitHub/Google)** | Cannot test real OAuth flows in CI | Test button presence and click initiation only; mock session for post-auth flows |
| **2FA (TOTP)** | Need to generate valid TOTP codes | Mock the API endpoints; OR use `otpauth` library in test to generate valid codes from a known secret seeded in DB |
| **Email delivery** | Resend/email sending is external | Mock the API; test only the form submission and UI feedback |
| **Drag and drop** | @dnd-kit is complex; `dragTo()` is unreliable | Keep existing drag test but also test via API mock (move endpoint) |
| **Agent code generation** | Real Claude API calls are expensive/slow | Mock all agent endpoints; test only the UI flow and review gate |
| **Billing (Paddle)** | External payment provider | Mock Paddle API; test only the billing page UI and plan display |
| **Real-time updates** | SWR polling with timing-sensitive assertions | Use `waitForResponse` to detect poll requests; avoid time-based assertions |
| **File uploads** | Attachment upload requires multipart handling | Use Playwright's `setInputFiles()` with a test fixture file |

### Mock vs Real Decision Matrix

| Component | Strategy | Reason |
|-----------|----------|--------|
| Database reads (GET) | REAL (seeded DB) | Validates full stack including Prisma queries |
| Database writes (POST/PATCH/DELETE) | MOCKED | Prevents test interference, ensures deterministic state |
| NextAuth session | REAL (storageState) | Tests real auth flow once in setup |
| AI/Agent APIs | MOCKED | External dependency, expensive, slow |
| Billing/Paddle | MOCKED | External dependency, requires real payment |
| Email/Resend | MOCKED | External dependency |
| File storage/S3 | MOCKED | External dependency |

### Performance Considerations

- **Serial execution** (`workers: 1`): Safe but slow. With 30+ spec files, full suite will take 15-25 minutes.
- **Mitigation**: Use `@tag` annotations to run subsets in CI (e.g., `@critical` on every PR, full suite nightly).
- **Future**: If tests are stable, increase to `workers: 2` with database-per-worker isolation.

### Test Maintenance Risks

- **SWR re-renders** cause detached elements. The 500ms settle wait is a band-aid. Monitor for flakiness.
- **Next.js error boundaries** can mask real errors. The retry logic in page objects handles this but adds complexity.
- **Selector fragility**: `data-testid` attributes are stable but must be maintained as components evolve. The Coder should add the testids listed in Section 9 alongside the spec implementation.

---

## 15. Implementation Order

The Coder should implement in this priority order:

### Phase 1: Infrastructure (do first)
1. Expand `seed-test-db.ts` with additional users, orgs, public project
2. Expand `test-data.ts` with new constants
3. Create `roles.fixture.ts`
4. Expand `auth.setup.ts` with admin/member login
5. Create `api-client.ts` and `wait-helpers.ts`
6. Add all `data-testid` selectors to source components

### Phase 2: Critical Path Tests
7. `story-transitions.spec.ts` -- validates core workflow
8. `agent-review.spec.ts` -- validates trust gate
9. `rbac.spec.ts` -- validates access control
10. `public-board.spec.ts` -- validates data isolation

### Phase 3: Feature Tests
11. `org-management.spec.ts`
12. `org-invites.spec.ts`
13. `project-crud.spec.ts`
14. `account-settings.spec.ts`
15. `story-dependencies.spec.ts`

### Phase 4: Edge Cases
16. `onboarding.spec.ts`
17. `password-reset.spec.ts`
18. `two-factor-auth.spec.ts`
19. `error-handling.spec.ts`
20. `empty-states.spec.ts`

### Phase 5: Polish
21. `navigation.spec.ts`
22. `theme.spec.ts`
23. `saved-filters.spec.ts`
24. `webhooks.spec.ts`
25. `security-abuse.spec.ts`

### New Page Objects (create alongside their specs)
- `dashboard.page.ts` -- Phase 1 (infrastructure)
- `org-settings.page.ts` -- Phase 3 (with org-management.spec.ts)
- `org-members.page.ts` -- Phase 3 (with org-invites.spec.ts)
- `account.page.ts` -- Phase 3 (with account-settings.spec.ts)
- `public-board.page.ts` -- Phase 2 (with public-board.spec.ts)
- `forgot-password.page.ts` -- Phase 4 (with password-reset.spec.ts)
- `two-factor.page.ts` -- Phase 4 (with two-factor-auth.spec.ts)
- `onboarding.page.ts` -- Phase 4 (with onboarding.spec.ts)

---

## 16. Summary Metrics

| Metric | Current | After Expansion |
|--------|---------|----------------|
| Spec files | 12 | 31 |
| Page objects | 6 | 14 |
| Fixture files | 2 | 3 |
| Helper files | 2 | 4 |
| Seeded users | 1 | 4 |
| Seeded orgs | 1 | 2 |
| Seeded projects | 1 | 2 |
| data-testid selectors | ~35 | ~110 |
| Estimated test count | ~55 | ~170 |
| Feature coverage | ~40% | ~90% |
