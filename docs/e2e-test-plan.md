# CodePylot E2E Test Plan -- Comprehensive Browser Testing

**Version:** 1.0
**Date:** 2026-03-26
**Author:** Product Manager (CodePylot)
**Status:** APPROVED FOR IMPLEMENTATION

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scope and Coverage Matrix](#scope-and-coverage-matrix)
3. [Test Infrastructure Requirements](#test-infrastructure-requirements)
4. [CRITICAL Priority Journeys (1-8)](#critical-priority-journeys)
5. [HIGH Priority Journeys (9-18)](#high-priority-journeys)
6. [MEDIUM Priority Journeys (19-30)](#medium-priority-journeys)
7. [LOW Priority Journeys (31-36)](#low-priority-journeys)
8. [New data-testid Selectors Required](#new-data-testid-selectors-required)
9. [Test Data Seeding Requirements](#test-data-seeding-requirements)
10. [Execution Order and Dependencies](#execution-order-and-dependencies)

---

## Executive Summary

This document defines 36 end-to-end user journeys for the CodePylot SaaS application. Of the 36, 12 existing test suites provide partial coverage. This plan identifies all gaps, specifies new `data-testid` selectors, and provides explicit acceptance criteria for each journey.

**Coverage baseline:**
- 12 existing spec files with ~55 test cases
- 35 existing `data-testid` selectors
- 42 page routes, 80+ API routes covered by unit/integration tests but NOT by E2E

**Target coverage after implementation:**
- 36 spec files (24 new)
- ~160 test cases total
- 73+ `data-testid` selectors (38 new)

---

## Scope and Coverage Matrix

| # | Journey | Risk | Existing Suite | Coverage Status |
|---|---------|------|---------------|-----------------|
| 1 | Sign up + onboarding | CRITICAL | -- | NO COVERAGE |
| 2 | Login (credentials) | CRITICAL | auth.spec.ts | PARTIAL -- no signup, no logout |
| 3 | Login (GitHub OAuth) | CRITICAL | auth.spec.ts | PARTIAL -- button existence only |
| 4 | Logout | CRITICAL | -- | NO COVERAGE |
| 5 | Project + Board + Story flow | CRITICAL | board.spec.ts, dashboard.spec.ts | PARTIAL -- create project covered, drag exists |
| 6 | Story CRUD | CRITICAL | story-detail.spec.ts | PARTIAL -- no delete test |
| 7 | Story state transitions | CRITICAL | board.spec.ts | PARTIAL -- drag only, no status dropdown |
| 8 | Protected route access | CRITICAL | auth.spec.ts | COVERED -- redirect to /login verified |
| 9 | Password reset flow | HIGH | -- | NO COVERAGE |
| 10 | 2FA setup + login | HIGH | -- | NO COVERAGE |
| 11 | Org management | HIGH | -- | NO COVERAGE |
| 12 | Org invite + accept | HIGH | -- | NO COVERAGE |
| 13 | RBAC enforcement | HIGH | -- | NO COVERAGE |
| 14 | Quick capture (Cmd+K) | HIGH | quick-capture.spec.ts | COVERED |
| 15 | AI story rewrite | HIGH | ai-rewrite.spec.ts | COVERED |
| 16 | Sprint management | HIGH | sprints.spec.ts | PARTIAL -- no story assignment |
| 17 | Story comments | HIGH | comments.spec.ts | COVERED |
| 18 | Board filters + saved filters | HIGH | -- | NO COVERAGE |
| 19 | Bulk story operations | MEDIUM | bulk-operations.spec.ts | COVERED |
| 20 | Story import | MEDIUM | -- | NO COVERAGE |
| 21 | Story export | MEDIUM | export.spec.ts | COVERED |
| 22 | Project settings | MEDIUM | settings.spec.ts | COVERED |
| 23 | Webhook management | MEDIUM | settings.spec.ts | PARTIAL -- add only, no delete/test |
| 24 | Account profile | MEDIUM | -- | NO COVERAGE |
| 25 | Notification preferences | MEDIUM | -- | NO COVERAGE |
| 26 | Public board sharing | MEDIUM | -- | NO COVERAGE |
| 27 | Story dependencies | MEDIUM | -- | NO COVERAGE |
| 28 | Story attachments | MEDIUM | -- | NO COVERAGE |
| 29 | Agent review flow | MEDIUM | agent.spec.ts | PARTIAL -- no approve/reject action |
| 30 | Diff viewer + risk detection | MEDIUM | story-detail.spec.ts | PARTIAL -- tab visibility only |
| 31 | Dark/light theme | LOW | -- | NO COVERAGE |
| 32 | Org audit log | LOW | -- | NO COVERAGE |
| 33 | Landing page navigation | LOW | -- | NO COVERAGE |
| 34 | Blog/changelog/roadmap | LOW | -- | NO COVERAGE |
| 35 | Error boundaries | LOW | -- | NO COVERAGE |
| 36 | Empty states | LOW | -- | NO COVERAGE |

---

## Test Infrastructure Requirements

### Existing infrastructure (no changes needed)
- `e2e/auth.setup.ts` -- authenticates via credentials, saves storageState
- `e2e/fixtures/auth.fixture.ts` -- provides `authenticatedPage` fixture
- `e2e/fixtures/test-data.ts` -- TEST_USER, TEST_ORG, TEST_PROJECT, TEST_STORIES, TEST_SPRINT
- `e2e/helpers/mock-api.ts` -- API route mocking utilities
- `e2e/helpers/page-objects/` -- LoginPage, BoardPage, StoryModalPage, QuickCapturePage, SettingsPage, SprintsPage
- `e2e/seed-test-db.ts` -- seeds DB with test fixtures

### New infrastructure needed
- **Page objects:** ForgotPasswordPage, ResetPasswordPage, Verify2FAPage, OnboardingPage, OrgMembersPage, OrgSettingsPage, ProfilePage, NotificationsPage, PublicBoardPage, BillingPage, AuditLogPage
- **Test data additions:** TEST_MEMBER_USER (MEMBER role), TEST_ADMIN_USER (ADMIN role), TEST_INVITE, TEST_WEBHOOK
- **Seed additions:** Second org, member user with MEMBER role, pending invite record, webhook record, public project

---

## CRITICAL Priority Journeys

---

### Journey 1: Sign Up (Credentials) + Auto Workspace + Onboarding + Dashboard

**File:** `e2e/signup.spec.ts`
**Risk:** CRITICAL
**Existing coverage:** NONE
**Description:** A new user creates an account with email/password, lands on the onboarding flow, names their workspace, optionally creates a first project, completes onboarding, and arrives at the dashboard.

**Preconditions:**
- Fresh browser context (no auth cookies)
- Sign-up endpoint available (NextAuth credentials provider with registration)

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 1.1 | Login page shows a "Sign up" or "Create account" link | Assert link visible, href points to signup route |
| 1.2 | Sign-up form accepts name, email, password | Fill all fields, submit |
| 1.3 | After signup, user is redirected to `/onboarding` | `page.waitForURL('**/onboarding')` |
| 1.4 | Onboarding step 0 shows "Welcome to Codepylot" heading | Assert heading visible |
| 1.5 | User can enter workspace name and click Continue | Fill input, click Continue, step advances |
| 1.6 | Onboarding step 1 shows "Create Your First Project" | Assert heading visible |
| 1.7 | User can skip project creation | Click Skip, step advances to 2 |
| 1.8 | Onboarding step 2 shows "You're all set!" | Assert heading visible |
| 1.9 | Clicking "Go to Dashboard" redirects to `/dashboard` | `page.waitForURL('**/dashboard')` |
| 1.10 | Dashboard shows the workspace name | Assert org name visible in header/sidebar |

**New data-testid selectors needed:**
- `signup-name` -- name input on signup form
- `signup-email` -- email input on signup form
- `signup-password` -- password input on signup form
- `signup-submit` -- submit button on signup form
- `onboarding-workspace-name` -- workspace name input (step 0)
- `onboarding-continue` -- Continue button (step 0)
- `onboarding-project-name` -- project name input (step 1)
- `onboarding-skip` -- Skip button (step 1)
- `onboarding-create-project` -- Create Project button (step 1)
- `onboarding-complete` -- Go to Dashboard button (step 2)

**Notes:** This journey requires creating a real user in the test DB or mocking the signup API. If the app uses NextAuth's credentials provider for registration, the test must POST to the register endpoint first. Consider using a unique email per test run to avoid conflicts.

---

### Journey 2: Login (Credentials) + Dashboard Access

**File:** `e2e/auth.spec.ts` (existing)
**Risk:** CRITICAL
**Existing coverage:** COVERED -- tests "logs in with credentials and redirects to /dashboard" and "shows error on invalid credentials"
**Description:** User enters valid email/password on `/login`, submits, and lands on `/dashboard`.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 2.1 | Login form displays email, password inputs and submit button | Assert testids `login-email`, `login-password`, `login-submit` visible |
| 2.2 | Valid credentials redirect to `/dashboard` | Fill TEST_USER credentials, submit, waitForURL `/dashboard` |
| 2.3 | Invalid credentials stay on `/login` with error indication | Fill wrong creds, submit, assert URL still `/login` |
| 2.4 | Session persists across page navigations | Login, navigate away, navigate back, assert still on `/dashboard` |

**Gaps in existing tests:** None. All four criteria are covered by existing `auth.spec.ts`.

**Existing data-testid selectors used:** `login-email`, `login-password`, `login-submit`

---

### Journey 3: Login (GitHub OAuth) + Dashboard Access

**File:** `e2e/auth.spec.ts` (existing)
**Risk:** CRITICAL
**Existing coverage:** PARTIAL -- only verifies button existence and text
**Description:** User clicks "Continue with GitHub" on `/login`, is redirected to GitHub OAuth, authorizes, and lands on `/dashboard`.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 3.1 | GitHub login button is visible and enabled | Assert testid `login-github` visible and enabled |
| 3.2 | Clicking GitHub button initiates OAuth redirect | Click button, assert navigation starts (URL contains `github.com` or CSRF redirect) |
| 3.3 | After OAuth callback, user lands on `/dashboard` | Cannot test real OAuth in E2E -- mock the callback |

**Gaps in existing tests:** Test 3.2 and 3.3 are NOT covered. The existing test only checks button visibility.

**Implementation note:** True OAuth E2E requires either (a) a test GitHub account or (b) mocking the OAuth callback by intercepting the NextAuth callback URL and injecting a session. Recommendation: mock the callback route to simulate a successful OAuth flow.

**Existing data-testid selectors used:** `login-github`

**New data-testid selectors needed:** None

---

### Journey 4: Logout + Redirect to Login

**File:** `e2e/logout.spec.ts` (NEW)
**Risk:** CRITICAL
**Existing coverage:** NONE
**Description:** An authenticated user clicks the logout button/menu, session is destroyed, user is redirected to `/login`.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 4.1 | Logout control is accessible from the authenticated UI | Assert user menu or logout button visible |
| 4.2 | Clicking logout redirects to `/login` | Click logout, `page.waitForURL('**/login')` |
| 4.3 | After logout, accessing `/dashboard` redirects to `/login` | Navigate to `/dashboard`, assert redirect to `/login` |
| 4.4 | Session cookie is cleared | Check that auth cookie is no longer present |

**New data-testid selectors needed:**
- `user-menu-trigger` -- the avatar/button that opens the user dropdown
- `user-menu-logout` -- the logout menu item

---

### Journey 5: Create Project + View Board + Create Story + Move Story

**File:** `e2e/project-board-flow.spec.ts` (NEW)
**Risk:** CRITICAL
**Existing coverage:** PARTIAL -- `dashboard.spec.ts` covers project creation dialog and navigation; `board.spec.ts` covers column display and drag; but no single E2E flow connects all steps
**Description:** End-to-end flow: user creates a new project from the dashboard, navigates to its Kanban board, creates a story via quick capture, and moves it across columns.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 5.1 | User clicks "Create Project" on dashboard | Click testid `create-project-btn`, dialog opens |
| 5.2 | User fills project name, description, tech stack and submits | Fill form, click Create, dialog closes |
| 5.3 | New project card appears on dashboard | Assert project card visible (or toast confirmation) |
| 5.4 | Clicking project card navigates to board | Click card, waitForURL `**/projects/**` |
| 5.5 | Board shows 5 columns | Assert columns BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE visible |
| 5.6 | User creates a story via Cmd+K quick capture | Open quick capture, type title, click Create |
| 5.7 | New story appears in BACKLOG column | Assert story card visible in BACKLOG column |
| 5.8 | User drags story from BACKLOG to TODO | Perform drag, mock move API, assert card in TODO |

**Gaps:** No existing test covers this full flow end-to-end. Individual pieces exist but not as a connected journey.

**Existing data-testid selectors used:** `create-project-btn`, `board-column-{id}`, `story-card-{shortId}`, `quick-capture-input`, `quick-capture-create-btn`

---

### Journey 6: Story CRUD (Create, Read, Update, Delete)

**File:** `e2e/story-crud.spec.ts` (NEW)
**Risk:** CRITICAL
**Existing coverage:** PARTIAL -- `story-detail.spec.ts` covers open, display, edit title, change priority. Delete is NOT tested.
**Description:** Full lifecycle of a story: create via quick capture, open to read details, update title/priority/description, and delete.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 6.1 | Create story via quick capture | Type title, click Create, story appears on board |
| 6.2 | Open story detail modal by clicking card | Click card, assert modal opens with correct title |
| 6.3 | Read story fields: title, shortId, priority, type, points | Assert all fields displayed correctly |
| 6.4 | Update title via inline edit and save | Clear title, type new title, click Save, assert PATCH called |
| 6.5 | Update priority via dropdown | Click priority select, choose new value, assert PATCH called |
| 6.6 | Update description | Type in description field, save, assert PATCH called |
| 6.7 | Delete story via delete button in modal | Click delete, confirm, assert DELETE called, modal closes |

**Gaps:** Test 6.6 (description update) and 6.7 (delete) are NOT covered by existing tests.

**New data-testid selectors needed:**
- `story-detail-description` -- already exists but verify it's on the editable textarea
- `story-detail-delete` -- delete button in story detail modal

**Existing data-testid selectors used:** `story-detail-title`, `story-detail-priority`, `story-detail-save`

---

### Journey 7: Story State Transitions (Full Pipeline)

**File:** `e2e/story-transitions.spec.ts` (NEW)
**Risk:** CRITICAL
**Existing coverage:** PARTIAL -- `board.spec.ts` tests drag between columns but does not verify the status change API call or the full BACKLOG->TODO->IN_PROGRESS->REVIEW->DONE pipeline
**Description:** A story moves through every status in the correct order, verifying that invalid transitions are blocked.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 7.1 | Story starts in BACKLOG | Assert story card in BACKLOG column |
| 7.2 | Move BACKLOG -> TODO via status dropdown in modal | Open modal, change status to TODO, save, assert card moves |
| 7.3 | Move TODO -> IN_PROGRESS | Change status, assert card in IN_PROGRESS |
| 7.4 | Move IN_PROGRESS -> REVIEW | Change status, assert card in REVIEW |
| 7.5 | Move REVIEW -> DONE (non-agent story) | Change status, assert card in DONE |
| 7.6 | Agent story in REVIEW cannot move to DONE without reviewedAt | Mock agent story, attempt DONE, assert 422 or button disabled |
| 7.7 | Drag-and-drop moves story between columns | Drag card, assert move API called with correct status |

**New data-testid selectors needed:**
- `story-detail-status` -- status dropdown/select in story detail modal

**Existing data-testid selectors used:** `board-column-{id}`, `story-card-{shortId}`, `story-detail-save`

---

### Journey 8: Protected Route Access (Unauthenticated Redirect)

**File:** `e2e/auth.spec.ts` (existing)
**Risk:** CRITICAL
**Existing coverage:** COVERED
**Description:** An unauthenticated user trying to access `/dashboard` is redirected to `/login`.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 8.1 | Navigating to `/dashboard` without auth redirects to `/login` | goto `/dashboard`, waitForURL `/login` |
| 8.2 | Navigating to `/projects/xxx` without auth redirects to `/login` | goto project URL, waitForURL `/login` |
| 8.3 | Navigating to `/org/members` without auth redirects to `/login` | goto org URL, waitForURL `/login` |

**Gaps:** Tests 8.2 and 8.3 are NOT in existing suite. Only `/dashboard` redirect is tested.

---

## HIGH Priority Journeys

---

### Journey 9: Password Reset Flow

**File:** `e2e/password-reset.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE (auth.spec.ts only checks forgot-password link exists)
**Description:** User clicks "Forgot password?" on login, enters email, receives confirmation, navigates to reset page with token, enters new password, and can log in.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 9.1 | "Forgot password?" link on login page navigates to `/forgot-password` | Click link, assert URL is `/forgot-password` |
| 9.2 | Forgot password page shows email input and "Send Reset Link" button | Assert input and button visible |
| 9.3 | Submitting email shows confirmation message | Fill email, submit, assert "Check your email" text visible |
| 9.4 | Reset password page at `/reset-password?token=xxx` shows form | Navigate with mock token, assert form visible |
| 9.5 | Password mismatch shows error | Enter mismatched passwords, submit, assert error |
| 9.6 | Password too short shows error | Enter <8 char password, submit, assert error |
| 9.7 | Valid password reset shows success and "Go to Login" link | Mock API, submit valid passwords, assert success message |
| 9.8 | Missing token shows "Invalid reset link" | Navigate without token, assert invalid message |

**New data-testid selectors needed:**
- `forgot-password-email` -- email input on forgot password page
- `forgot-password-submit` -- Send Reset Link button
- `reset-password-new` -- new password input
- `reset-password-confirm` -- confirm password input
- `reset-password-submit` -- Reset Password button

---

### Journey 10: 2FA Setup and Login Challenge

**File:** `e2e/two-factor-auth.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE
**Description:** User enables 2FA from account security settings, scans QR code (mocked), enters TOTP code to verify, sees backup codes. On next login, user is challenged with 2FA form.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 10.1 | Security page (`/account/security`) shows "Set Up 2FA" button | Navigate, assert button visible |
| 10.2 | Clicking "Set Up 2FA" shows QR code and manual key | Mock API, assert img and code element visible |
| 10.3 | Entering valid TOTP code enables 2FA and shows backup codes | Mock verify API, assert backup codes grid visible |
| 10.4 | Backup codes are displayed in a grid | Assert grid with code elements visible |
| 10.5 | 2FA login challenge page shows code input | Navigate to `/verify-2fa`, assert input visible |
| 10.6 | Entering valid code redirects to `/dashboard` | Mock challenge API, submit, waitForURL `/dashboard` |
| 10.7 | Entering invalid code shows error | Mock 401, submit, assert error text visible |
| 10.8 | Disable 2FA with valid code succeeds | Fill disable code, click Disable, assert step returns to idle |

**New data-testid selectors needed:**
- `2fa-setup-btn` -- Set Up 2FA button
- `2fa-totp-input` -- TOTP code input during setup verification
- `2fa-verify-btn` -- Verify button during setup
- `2fa-challenge-input` -- code input on /verify-2fa page
- `2fa-challenge-submit` -- Verify button on /verify-2fa page
- `2fa-disable-input` -- code input for disabling 2FA
- `2fa-disable-btn` -- Disable button

---

### Journey 11: Organization Management

**File:** `e2e/org-management.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE
**Description:** User creates a new org, switches between orgs, renames an org.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 11.1 | Org switcher in header/sidebar lists current org | Assert org switcher visible with TEST_ORG name |
| 11.2 | Org switcher allows creating a new org | Click switcher, click "Create Organization", assert dialog |
| 11.3 | Creating org calls POST `/api/orgs` | Mock API, fill name, submit, assert POST called |
| 11.4 | Switching org calls POST `/api/orgs/switch` | Click different org in switcher, assert switch API called |
| 11.5 | After switching, dashboard shows new org's projects | Assert project list updates |
| 11.6 | Org settings page (`/org/settings`) shows org name | Navigate, assert name input populated |
| 11.7 | Renaming org calls PATCH `/api/orgs/{orgId}` | Edit name, save, assert PATCH called |

**New data-testid selectors needed:**
- `org-switcher` -- the org switcher component
- `org-switcher-create` -- create new org option
- `org-name-input` -- org name input on org settings page
- `org-save-btn` -- save button on org settings page

---

### Journey 12: Org Member Invite + Accept + Access

**File:** `e2e/org-invite.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE
**Description:** OWNER/ADMIN invites a user by email, invite appears in pending list, invited user accepts via `/invite?token=xxx`, and gains access.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 12.1 | Members page (`/org/members`) shows invite form for OWNER/ADMIN | Navigate, assert email input and Invite button visible |
| 12.2 | Submitting invite calls POST `/api/orgs/{orgId}/members` | Fill email, select role, submit, assert POST called |
| 12.3 | Pending invitation appears in list | Assert invited email visible in pending section |
| 12.4 | Cancel invite button removes pending invite | Click cancel, assert DELETE called |
| 12.5 | Invite page (`/invite?token=xxx`) shows accept button | Navigate with token, assert "Accept Invitation" visible |
| 12.6 | Accepting invite calls POST `/api/invites/accept` | Click Accept, assert POST called |
| 12.7 | After acceptance, user is redirected to `/dashboard` | Assert redirect |
| 12.8 | Invite page without token shows "Invalid Invitation" | Navigate without token, assert error message |

**New data-testid selectors needed:**
- `invite-email-input` -- email input on members page invite form
- `invite-role-select` -- role select dropdown
- `invite-submit-btn` -- Invite button
- `invite-accept-btn` -- Accept Invitation button on /invite page
- `invite-cancel-btn` -- cancel button on pending invite row

---

### Journey 13: RBAC Enforcement

**File:** `e2e/rbac.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE
**Description:** Verifies that MEMBER role cannot perform OWNER/ADMIN-only actions (delete project, manage members, change org settings), while OWNER can.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 13.1 | MEMBER cannot see invite form on `/org/members` | Login as MEMBER, navigate, assert invite form NOT visible |
| 13.2 | MEMBER cannot see delete button on project settings | Navigate to project settings, assert no delete section |
| 13.3 | MEMBER cannot access `/org/settings` or sees read-only | Navigate, assert no save button or restricted UI |
| 13.4 | OWNER can see invite form on `/org/members` | Login as OWNER, navigate, assert form visible |
| 13.5 | OWNER can see delete project option | Navigate to project settings, assert delete visible |
| 13.6 | API rejects MEMBER attempting to delete project | Mock or intercept DELETE, assert 403 |

**Seed requirements:** A second user with MEMBER role in the test org.

**New data-testid selectors needed:**
- `project-delete-btn` -- delete project button on settings page

---

### Journey 14: Quick Capture (Cmd+K) + Create Story

**File:** `e2e/quick-capture.spec.ts` (existing)
**Risk:** HIGH
**Existing coverage:** COVERED -- 6 tests covering open, type, create, template picker, NL commands, toast
**Description:** User opens quick capture with Cmd+K, types an idea, and creates a story.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** None.

---

### Journey 15: AI Story Rewrite

**File:** `e2e/ai-rewrite.spec.ts` (existing)
**Risk:** HIGH
**Existing coverage:** COVERED -- 6 tests covering trigger, display, edit, error, usage limit, create with rewritten data
**Description:** User triggers AI rewrite from quick capture, sees structured output, edits, and creates.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** None.

---

### Journey 16: Sprint Management

**File:** `e2e/sprints.spec.ts` (existing, needs expansion)
**Risk:** HIGH
**Existing coverage:** PARTIAL -- display, progress, create, status change. Missing: assign stories to sprint, complete sprint, sprint burndown.
**Description:** User creates a sprint, assigns stories, starts the sprint, views progress, and completes it.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 16.1 | Sprint list page loads | Assert "Sprint" heading visible (COVERED) |
| 16.2 | Create sprint with name and goal | Fill form, submit (COVERED) |
| 16.3 | Change sprint status PLANNING -> ACTIVE | Click Start button (COVERED) |
| 16.4 | Assign story to sprint from story detail | Open story, select sprint, save, assert PATCH called |
| 16.5 | Sprint shows assigned stories count | Assert story count in sprint card |
| 16.6 | Complete sprint | Click Complete button, assert PATCH called |

**Gaps:** Tests 16.4, 16.5, 16.6 are NOT covered.

**New data-testid selectors needed:**
- `story-detail-sprint` -- sprint select in story detail modal
- `sprint-complete-btn` -- complete sprint button
- `sprint-story-count` -- story count in sprint card

---

### Journey 17: Story Comments

**File:** `e2e/comments.spec.ts` (existing)
**Risk:** HIGH
**Existing coverage:** COVERED -- display, add, author/timestamp, delete
**Description:** User adds, views, and deletes comments on a story.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** Edit comment is NOT tested, but this is acceptable since the UI may not support inline editing.

---

### Journey 18: Board Filters and Saved Filters

**File:** `e2e/board-filters.spec.ts` (NEW)
**Risk:** HIGH
**Existing coverage:** NONE
**Description:** User filters board by priority, type, assignee, or label. User saves a filter configuration and loads it later.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 18.1 | Filter bar is visible on the board | Assert filter controls visible |
| 18.2 | Filtering by priority shows only matching stories | Select priority=HIGH, assert only HIGH stories visible |
| 18.3 | Filtering by type shows only matching stories | Select type=bug, assert only bug stories visible |
| 18.4 | Clearing filters restores all stories | Click clear, assert all stories visible |
| 18.5 | Saving a filter calls POST `/api/projects/{id}/saved-filters` | Click Save Filter, assert POST called |
| 18.6 | Loading a saved filter applies it | Select saved filter, assert board filters to match |
| 18.7 | Deleting a saved filter calls DELETE | Click delete on saved filter, assert DELETE called |

**New data-testid selectors needed:**
- `board-filter-priority` -- priority filter dropdown
- `board-filter-type` -- type filter dropdown
- `board-filter-clear` -- clear filters button
- `board-filter-save` -- save current filter button
- `board-saved-filters` -- saved filters dropdown/list

---

## MEDIUM Priority Journeys

---

### Journey 19: Bulk Story Operations

**File:** `e2e/bulk-operations.spec.ts` (existing)
**Risk:** MEDIUM
**Existing coverage:** COVERED -- toggle, selection, bulk status change, bulk priority, bulk delete, escape
**Description:** User selects multiple stories and performs bulk status change, priority change, or delete.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** None.

---

### Journey 20: Story Import (CSV/JSON)

**File:** `e2e/import.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User uploads a CSV or JSON file to bulk-create stories.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 20.1 | Import button is visible on the board | Assert testid `board-import-btn` visible |
| 20.2 | Clicking import opens file dialog/modal | Click button, assert dialog or file input visible |
| 20.3 | Uploading valid CSV calls POST `/api/projects/{id}/stories/import` | Upload fixture file, assert POST called |
| 20.4 | Success shows toast with count of imported stories | Assert toast with "imported" text |
| 20.5 | Invalid file shows error | Upload malformed file, assert error message |

**Existing data-testid selectors used:** `board-import-btn`, `import-file-input`, `import-submit-btn`

---

### Journey 21: Story Export

**File:** `e2e/export.spec.ts` (existing)
**Risk:** MEDIUM
**Existing coverage:** COVERED -- JSON and CSV export, button visibility
**Description:** User exports stories as JSON or CSV.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** None.

---

### Journey 22: Project Settings

**File:** `e2e/settings.spec.ts` (existing)
**Risk:** MEDIUM
**Existing coverage:** COVERED -- load, edit name, auto-assign toggle, AI provider, webhook add, Claude Code section
**Description:** User edits project name, toggles settings, and saves.

**Acceptance Criteria:** All met by existing tests.

**Gaps:** None.

---

### Journey 23: Webhook Management (Create, Test, Delete)

**File:** `e2e/webhook-management.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** PARTIAL -- `settings.spec.ts` covers adding a webhook URL only
**Description:** User creates a webhook, tests it (sends test delivery), views delivery log, and deletes it.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 23.1 | Webhook URL input and add button visible | Assert testids `webhook-url-input`, `webhook-add-btn` visible (COVERED) |
| 23.2 | Adding webhook calls POST `/api/projects/{id}/webhooks` | Fill URL, click Add, assert POST called |
| 23.3 | Created webhook appears in list | Assert webhook URL visible in list |
| 23.4 | Test button sends test delivery | Click Test, assert POST to deliveries endpoint |
| 23.5 | Delete webhook removes it from list | Click Delete, assert DELETE called, webhook removed |
| 23.6 | Webhook delivery list shows delivery status | Navigate to deliveries, assert status badges visible |

**New data-testid selectors needed:**
- `webhook-test-btn` -- test webhook button
- `webhook-delete-btn` -- delete webhook button
- `webhook-delivery-status` -- delivery status badge

---

### Journey 24: Account Profile Settings

**File:** `e2e/account-profile.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User views and edits their profile (name), and can delete their account.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 24.1 | Profile page (`/account/profile`) shows user name and email | Navigate, assert name input and email display |
| 24.2 | Editing name and saving calls PATCH `/api/account/profile` | Edit name, click Save, assert PATCH called |
| 24.3 | Delete account button shows confirmation dialog | Click Delete, assert confirmation dialog |
| 24.4 | Confirming delete calls DELETE `/api/account/delete` | Mock API, confirm, assert DELETE called |

**New data-testid selectors needed:**
- `profile-name-input` -- name input on profile page
- `profile-save-btn` -- save button on profile page
- `profile-delete-btn` -- delete account button

---

### Journey 25: Account Notification Preferences

**File:** `e2e/notification-preferences.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User views and updates email/in-app notification toggles and digest frequency.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 25.1 | Notifications page (`/account/notifications`) loads | Assert heading visible |
| 25.2 | Email toggle, In-App toggle, and Digest select are visible | Assert controls visible |
| 25.3 | Toggling email and saving calls PATCH | Toggle switch, click Save, assert PATCH called |
| 25.4 | Changing digest frequency and saving works | Select "daily", save, assert request body contains `digest: "daily"` |

**New data-testid selectors needed:**
- `notif-email-toggle` -- email notifications switch
- `notif-inapp-toggle` -- in-app notifications switch
- `notif-digest-select` -- digest frequency select
- `notif-save-btn` -- save button

---

### Journey 26: Public Board Sharing

**File:** `e2e/public-board.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User toggles a project to public, copies the share URL, and an anonymous user can view the public board.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 26.1 | Project settings shows public toggle | Assert testid `settings-public-toggle` visible |
| 26.2 | Toggling public on shows the public URL | Toggle on, assert testid `settings-public-url` visible |
| 26.3 | Public board page (`/board/{slug}`) loads without auth | Use fresh context (no cookies), navigate, assert board visible |
| 26.4 | Public board shows story titles, shortIds, statuses | Assert story cards visible with safe fields |
| 26.5 | Public board does NOT show descriptions or comments | Assert no description/comment content leaked |
| 26.6 | Private project returns 404 on public board URL | Set project private, navigate, assert 404/not found |
| 26.7 | Share button is visible on public board | Assert testid `public-board-share-btn` visible |

**Existing data-testid selectors used:** `settings-public-toggle`, `settings-public-url`, `public-board-share-btn`

---

### Journey 27: Story Dependencies

**File:** `e2e/story-dependencies.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User adds a dependency (blocked-by) to a story, views it, and removes it.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 27.1 | Story detail modal shows Dependencies section | Open modal, assert dependencies area visible |
| 27.2 | Adding a dependency calls POST `/api/projects/{id}/stories/{id}/dependencies` | Select blocking story, assert POST called |
| 27.3 | Dependency appears in the list | Assert blocking story shortId visible |
| 27.4 | Removing dependency calls DELETE | Click remove, assert DELETE called |
| 27.5 | Blocked story shows "blocked" indicator | Assert blocked badge or icon visible |

**New data-testid selectors needed:**
- `story-dependencies-section` -- dependencies area in modal
- `story-add-dependency-btn` -- add dependency button
- `story-dependency-item` -- individual dependency row

---

### Journey 28: Story Attachments

**File:** `e2e/story-attachments.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** NONE
**Description:** User attaches a file to a story and views/downloads it.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 28.1 | Story detail modal shows Attachments section | Open modal, assert attachments area visible |
| 28.2 | Upload file calls POST `/api/projects/{id}/stories/{id}/attachments` | Upload fixture file, assert POST called |
| 28.3 | Uploaded attachment appears in list with filename | Assert filename visible |
| 28.4 | Attachment can be downloaded/opened | Assert download link href is valid |

**New data-testid selectors needed:**
- `story-attachments-section` -- attachments area in modal
- `story-attach-file-input` -- file input for upload
- `story-attachment-item` -- individual attachment row

---

### Journey 29: Agent Trigger + Review + Approve/Reject Flow

**File:** `e2e/agent.spec.ts` (existing, needs expansion)
**Risk:** MEDIUM
**Existing coverage:** PARTIAL -- trigger, status badge, logs tab, auto-refresh, revert button visible. Missing: actual approve action, reject with feedback, confirm-review gate.
**Description:** User triggers an agent on a story, views progress, and then approves or rejects the agent's work through the Trust Gate.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 29.1 | Agent can be triggered from story detail | Click trigger, assert API called (COVERED) |
| 29.2 | Agent logs show progress | Switch to Logs tab, assert log content (COVERED) |
| 29.3 | Review panel shows Approve/Request Changes buttons | Assert buttons visible (COVERED partially) |
| 29.4 | Approve button is DISABLED until diff is viewed | Assert button disabled initially |
| 29.5 | Clicking "View Diff" calls POST `/confirm-review` | Click testid `review-view-diff-btn`, assert POST called |
| 29.6 | After confirming review, Approve button becomes enabled | Assert button enabled after diff view |
| 29.7 | Clicking Approve moves story to DONE | Mock approve API, click Approve, assert status change |
| 29.8 | Clicking Request Changes opens feedback form | Click Request Changes, assert textarea visible |
| 29.9 | Submitting feedback calls review API with rejection | Fill feedback, submit, assert POST called with feedback |

**Existing data-testid selectors used:** `review-view-diff-btn`

**New data-testid selectors needed:**
- `review-approve-btn` -- Approve button in review panel
- `review-reject-btn` -- Request Changes button
- `review-feedback-input` -- feedback textarea for rejection
- `review-feedback-submit` -- submit feedback button

---

### Journey 30: Diff Viewer with Risk Detection

**File:** `e2e/diff-viewer.spec.ts` (NEW)
**Risk:** MEDIUM
**Existing coverage:** PARTIAL -- `story-detail.spec.ts` checks diff tab visibility. Actual diff rendering and risk indicators are NOT tested.
**Description:** User views the diff for an agent-completed story and sees risk indicators for dangerous patterns.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 30.1 | Diff tab is visible for stories with branchName | Open review1, assert Diff tab visible (COVERED) |
| 30.2 | Clicking Diff tab shows diff content | Click tab, assert diff lines visible |
| 30.3 | Risk indicators shown for hardcoded secrets | Mock diff with `api_key=xxx`, assert risk badge |
| 30.4 | Risk indicators shown for eval/exec | Mock diff with `eval(`, assert risk badge |
| 30.5 | Risk indicators shown for console.log | Mock diff with `console.log`, assert risk badge |
| 30.6 | Risk summary count is displayed | Assert "X risks found" or risk count visible |

**New data-testid selectors needed:**
- `diff-viewer-content` -- the diff content area
- `diff-risk-badge` -- risk indicator badge
- `diff-risk-count` -- risk summary count

---

## LOW Priority Journeys

---

### Journey 31: Dark/Light Theme Toggle

**File:** `e2e/theme.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** User toggles between dark and light themes, preference persists.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 31.1 | Theme toggle is accessible in the UI | Assert toggle button visible |
| 31.2 | Clicking toggle switches `<html>` class from `light` to `dark` | Assert `document.documentElement.classList.contains('dark')` |
| 31.3 | Theme persists after page reload | Toggle, reload, assert class preserved |

**New data-testid selectors needed:**
- `theme-toggle` -- theme toggle button

---

### Journey 32: Org Audit Log

**File:** `e2e/audit-log.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** OWNER views the audit log showing org activity history.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 32.1 | Audit log page (`/org/audit-log`) loads for OWNER | Navigate, assert heading visible |
| 32.2 | Audit log shows activity entries | Assert at least one log entry visible |
| 32.3 | Each entry shows actor, action, timestamp | Assert log entry structure |

**New data-testid selectors needed:**
- `audit-log-entry` -- individual audit log row

---

### Journey 33: Landing Page Navigation

**File:** `e2e/landing-page.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** Anonymous user visits the landing page and navigates to login/signup.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 33.1 | Landing page (`/`) loads without auth | Use fresh context, navigate to `/`, assert page renders |
| 33.2 | "Get Started" or "Sign Up" CTA is visible | Assert CTA button visible |
| 33.3 | CTA navigates to `/login` or signup page | Click CTA, assert URL changes |
| 33.4 | Navigation links to features/pricing are visible | Assert links present |

---

### Journey 34: Blog/Changelog/Roadmap Pages

**File:** `e2e/content-pages.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** Public content pages load correctly.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 34.1 | `/blog` loads and shows posts | Navigate, assert heading and at least one post |
| 34.2 | `/changelog` loads and shows entries | Navigate, assert content visible |
| 34.3 | `/roadmap` loads and shows items | Navigate, assert content visible |
| 34.4 | Blog post detail page loads | Navigate to `/blog/{slug}`, assert article content |

---

### Journey 35: Error Boundary Behavior

**File:** `e2e/error-boundaries.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** Application handles error states gracefully.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 35.1 | 404 page for unknown routes | Navigate to `/nonexistent-page`, assert 404 content |
| 35.2 | Error boundary renders "Something went wrong" | Trigger error (mock failing API on critical data), assert error boundary |
| 35.3 | "Try Again" button recovers | Click Try Again, assert page attempts re-render |

---

### Journey 36: Empty States

**File:** `e2e/empty-states.spec.ts` (NEW)
**Risk:** LOW
**Existing coverage:** NONE
**Description:** Application shows helpful empty states when there is no data.

**Acceptance Criteria:**

| # | Criterion | Verification |
|---|-----------|-------------|
| 36.1 | Dashboard with no projects shows empty state | Mock empty project list, assert "No projects" or CTA visible |
| 36.2 | Board with no stories shows empty state | Mock empty stories, assert empty column message |
| 36.3 | Sprint page with no sprints shows empty state | Mock empty sprints, assert "Create your first sprint" or similar |
| 36.4 | Comments tab with no comments shows placeholder | Open story with no comments, assert placeholder text |

---

## New data-testid Selectors Required

Summary of all new selectors needed (38 total):

### Auth/Onboarding (10)
| Selector | Component | Page |
|----------|-----------|------|
| `signup-name` | Input | Signup form |
| `signup-email` | Input | Signup form |
| `signup-password` | Input | Signup form |
| `signup-submit` | Button | Signup form |
| `onboarding-workspace-name` | Input | /onboarding step 0 |
| `onboarding-continue` | Button | /onboarding step 0 |
| `onboarding-project-name` | Input | /onboarding step 1 |
| `onboarding-skip` | Button | /onboarding step 1 |
| `onboarding-create-project` | Button | /onboarding step 1 |
| `onboarding-complete` | Button | /onboarding step 2 |

### User Menu (2)
| Selector | Component | Page |
|----------|-----------|------|
| `user-menu-trigger` | Button | Header/Sidebar |
| `user-menu-logout` | MenuItem | User dropdown |

### Password Reset (5)
| Selector | Component | Page |
|----------|-----------|------|
| `forgot-password-email` | Input | /forgot-password |
| `forgot-password-submit` | Button | /forgot-password |
| `reset-password-new` | Input | /reset-password |
| `reset-password-confirm` | Input | /reset-password |
| `reset-password-submit` | Button | /reset-password |

### 2FA (7)
| Selector | Component | Page |
|----------|-----------|------|
| `2fa-setup-btn` | Button | /account/security |
| `2fa-totp-input` | Input | /account/security setup |
| `2fa-verify-btn` | Button | /account/security setup |
| `2fa-challenge-input` | Input | /verify-2fa |
| `2fa-challenge-submit` | Button | /verify-2fa |
| `2fa-disable-input` | Input | /account/security |
| `2fa-disable-btn` | Button | /account/security |

### Org/RBAC (6)
| Selector | Component | Page |
|----------|-----------|------|
| `org-switcher` | Component | Header |
| `org-switcher-create` | MenuItem | Org dropdown |
| `org-name-input` | Input | /org/settings |
| `org-save-btn` | Button | /org/settings |
| `invite-email-input` | Input | /org/members |
| `invite-submit-btn` | Button | /org/members |

### Story Detail (4)
| Selector | Component | Page |
|----------|-----------|------|
| `story-detail-status` | Select | Story modal |
| `story-detail-delete` | Button | Story modal |
| `story-detail-sprint` | Select | Story modal |
| `story-dependencies-section` | Div | Story modal |

### Review/Diff (6)
| Selector | Component | Page |
|----------|-----------|------|
| `review-approve-btn` | Button | Review panel |
| `review-reject-btn` | Button | Review panel |
| `review-feedback-input` | Textarea | Review panel |
| `diff-viewer-content` | Div | Diff tab |
| `diff-risk-badge` | Badge | Diff tab |
| `diff-risk-count` | Span | Diff tab |

### Board Filters (3)
| Selector | Component | Page |
|----------|-----------|------|
| `board-filter-priority` | Select | Board filter bar |
| `board-filter-type` | Select | Board filter bar |
| `board-filter-clear` | Button | Board filter bar |

### Other (3)
| Selector | Component | Page |
|----------|-----------|------|
| `theme-toggle` | Button | Header |
| `project-delete-btn` | Button | Project settings |
| `audit-log-entry` | Div | /org/audit-log |

---

## Test Data Seeding Requirements

The following additions to `e2e/seed-test-db.ts` and `e2e/fixtures/test-data.ts` are needed:

### New test constants in test-data.ts

```
TEST_MEMBER_USER = {
  id: "test-member-id",
  name: "Test Member",
  email: "member@codepylot.dev",
  password: "memberpass123",
  orgId: "test-org-id",
  role: "MEMBER"
}

TEST_ADMIN_USER = {
  id: "test-admin-id",
  name: "Test Admin",
  email: "admin@codepylot.dev",
  password: "adminpass123",
  orgId: "test-org-id",
  role: "ADMIN"
}

TEST_WEBHOOK = {
  id: "test-webhook-id",
  url: "https://example.com/webhook",
  projectId: TEST_PROJECT.id,
  events: ["story.created", "story.updated"]
}

TEST_PUBLIC_PROJECT = {
  id: "test-public-project-id",
  name: "Public Test Project",
  slug: "public-test-project",
  isPublic: true
}
```

### New seed records needed
1. User with MEMBER role (OrgMember record)
2. User with ADMIN role (OrgMember record)
3. Webhook record for test project
4. Public project with a few stories
5. Pending invite record

---

## Execution Order and Dependencies

### Phase 1: Auth Foundation (must run first)
1. `auth.setup.ts` -- creates auth session
2. `auth.spec.ts` (Journey 2, 3, 8) -- validates login works
3. `signup.spec.ts` (Journey 1) -- validates registration
4. `logout.spec.ts` (Journey 4) -- validates session teardown

### Phase 2: Core Features (depends on Phase 1)
5. `dashboard.spec.ts` (part of Journey 5)
6. `project-board-flow.spec.ts` (Journey 5) -- full flow
7. `story-crud.spec.ts` (Journey 6)
8. `story-transitions.spec.ts` (Journey 7)
9. `quick-capture.spec.ts` (Journey 14)
10. `comments.spec.ts` (Journey 17)

### Phase 3: Auth Advanced (can parallelize with Phase 2)
11. `password-reset.spec.ts` (Journey 9)
12. `two-factor-auth.spec.ts` (Journey 10)

### Phase 4: Org & RBAC (depends on Phase 1)
13. `org-management.spec.ts` (Journey 11)
14. `org-invite.spec.ts` (Journey 12)
15. `rbac.spec.ts` (Journey 13)

### Phase 5: Board & Sprint Features (depends on Phase 2)
16. `ai-rewrite.spec.ts` (Journey 15)
17. `sprints.spec.ts` (Journey 16)
18. `board-filters.spec.ts` (Journey 18)
19. `bulk-operations.spec.ts` (Journey 19)

### Phase 6: Import/Export & Settings (depends on Phase 2)
20. `import.spec.ts` (Journey 20)
21. `export.spec.ts` (Journey 21)
22. `settings.spec.ts` (Journey 22)
23. `webhook-management.spec.ts` (Journey 23)

### Phase 7: Account & Profile (depends on Phase 1)
24. `account-profile.spec.ts` (Journey 24)
25. `notification-preferences.spec.ts` (Journey 25)

### Phase 8: Advanced Features (depends on Phase 2)
26. `public-board.spec.ts` (Journey 26)
27. `story-dependencies.spec.ts` (Journey 27)
28. `story-attachments.spec.ts` (Journey 28)
29. `agent.spec.ts` (Journey 29)
30. `diff-viewer.spec.ts` (Journey 30)

### Phase 9: Polish (independent)
31. `theme.spec.ts` (Journey 31)
32. `audit-log.spec.ts` (Journey 32)
33. `landing-page.spec.ts` (Journey 33)
34. `content-pages.spec.ts` (Journey 34)
35. `error-boundaries.spec.ts` (Journey 35)
36. `empty-states.spec.ts` (Journey 36)

---

## Implementation Notes for Architect and Coder

1. **All new spec files go in `/e2e/`** -- following the existing convention.
2. **All new page objects go in `/e2e/helpers/page-objects/`** -- following existing pattern.
3. **Use API route mocking for write operations** -- existing tests already do this via `page.route()`. Never write to the real DB in tests.
4. **Read operations should use the real seeded DB** -- this is the existing pattern and provides more realistic coverage.
5. **Each new `data-testid` must be added to the corresponding React component** -- the Coder should add these as part of test implementation.
6. **Journeys that require a second user (RBAC, invites)** need separate auth storage state files and setup.
7. **OAuth tests should mock the callback** -- do not attempt to use real GitHub/Google OAuth in E2E.
8. **2FA tests should mock the TOTP API responses** -- do not generate real TOTP codes.
9. **Follow the existing fixture pattern** -- extend `auth.fixture.ts` for authenticated tests, use `storageState: { cookies: [], origins: [] }` for unauthenticated tests.
10. **Keep tests independent** -- each test should be able to run in isolation. Use `test.beforeEach` for setup, not test ordering.
