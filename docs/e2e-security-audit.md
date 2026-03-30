# E2E Security Audit Report

**Auditor:** Security Auditor Agent (CodePylot)
**Date:** 2026-03-26
**Scope:** 13 E2E spec files, 3 infrastructure files, 5 source security modules
**Application:** CodePylot (ShipFlow) SaaS - Next.js 16 + NextAuth v5

---

## Executive Summary

The E2E test suite provides **good foundational coverage** for authentication flows, RBAC enforcement, XSS prevention, and the agent review trust gate. However, several **critical and high-severity gaps** exist around rate limiting, CSRF, cookie security, session fixation, API key auth, webhook SSRF, and server-side authorization enforcement. The tests rely heavily on route mocking, which validates frontend behavior but does not exercise actual server-side security controls.

**Overall Verdict: PASS WITH FINDINGS**

---

## A. Authentication Security Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A1 | Login with valid credentials -> success | **PASS** | `auth.spec.ts` line 21: tests login with `TEST_USER` credentials, waits for `/dashboard` redirect |
| A2 | Login with invalid credentials -> error (no info leak) | **PASS** | `auth.spec.ts` line 33: tests `wrong@example.com` with wrong password, verifies redirect back to `/login`. Error message is generic (no username enumeration) |
| A3 | Session persistence across navigations | **PASS** | `auth.spec.ts` line 54: logs in, navigates away and back, confirms still on `/dashboard` |
| A4 | Session destruction on logout | **PASS** | `logout.spec.ts` line 16: clicks logout, verifies redirect to `/login` |
| A5 | Post-logout protected route access -> redirect | **PASS** | `logout.spec.ts` line 35: full flow - login, logout, then attempt `/dashboard` -> redirected to `/login` |
| A6 | OAuth button presence | **PASS** | `auth.spec.ts` line 10: verifies GitHub button is visible with correct text |
| A7 | Password reset doesn't leak email existence | **PASS** | `password-reset.spec.ts` line 37: tests non-existent email, verifies same success message shown (prevents enumeration) |
| A8 | 2FA enforcement in middleware | **PARTIAL** | `two-factor-auth.spec.ts` line 130: tests verify-2fa page loads, and line 145 tests valid code redirects to dashboard. However, **no test verifies that a 2FA-enabled user is blocked from accessing protected routes without completing 2FA** (the actual middleware enforcement at `middleware.ts` line 72-84) |
| A9 | 2FA backup code flow | **FAIL** | No tests exist for backup code authentication. The middleware references `totpEnabled` but no test exercises the backup code path |
| A10 | Password validation on reset | **PASS** | `password-reset.spec.ts` line 77: tests short password shows validation error |

---

## B. Authorization Security Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| B1 | OWNER can access all routes | **PASS** | `rbac.spec.ts` lines 7-27: OWNER accesses org settings and billing successfully |
| B2 | ADMIN cannot access billing | **PASS** | `rbac.spec.ts` line 31: ADMIN navigates to billing, expects redirect or forbidden |
| B3 | MEMBER cannot access settings/delete | **PASS** | `rbac.spec.ts` lines 97-159: MEMBER denied org settings, project delete button absent/disabled |
| B4 | Cross-org access denied (IDOR prevention) | **PARTIAL** | `security-abuse.spec.ts` line 181: tests accessing `other-org-project-id` via API, expects 401/403/404. However, this uses a non-existent ID, not a real second org's project. The seed creates `test-org-2-id` but no test attempts to access Org 1's project while authenticated as a user from Org 2 |
| B5 | API key auth tested | **FAIL** | No E2E test exercises the `Bearer` API key authentication path (`api-auth.ts` line 22). The SHA256 hashed key lookup is not tested |
| B6 | Unauthenticated API access -> 401 | **PASS** | `security-abuse.spec.ts` line 14: tests API request without auth returns 401 |
| B7 | MEMBER can view board | **PASS** | `rbac.spec.ts` line 161: MEMBER views project board, columns visible |

---

## C. Input Validation Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| C1 | XSS in story titles escaped | **PASS** | `security-abuse.spec.ts` line 32: injects `<script>alert("xss")</script>` in title, verifies no dialog triggered and no raw `<script>` in DOM |
| C2 | XSS in comments escaped | **PASS** | `security-abuse.spec.ts` line 80: injects `<img src=x onerror="alert('xss')">` in comment, verifies no dialog |
| C3 | XSS in descriptions escaped | **PASS** | `security-abuse.spec.ts` line 127: injects `<div onmouseover="alert(1)">` in description, verifies no `onmouseover` in DOM |
| C4 | SQL injection in search handled | **PARTIAL** | `security-abuse.spec.ts` line 193: attempts `'; DROP TABLE stories; --` in search, verifies no crash. However, the test conditionally runs only if a search input exists and uses `route.continue()` which hits the real API -- this is good, but the assertion only checks the page doesn't crash, not that the query is properly parameterized |
| C5 | HTML injection sanitized | **PASS** | Covered by C3 above (HTML payload with event handlers) |
| C6 | NoSQL injection tested | **FAIL** | No tests for `$where`, `$gt`, `$ne` or similar MongoDB/Prisma injection patterns |

---

## D. Review Gate (Trust Gate) Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| D1 | Agent story cannot move to DONE without reviewedAt | **PASS** | `story-transitions.spec.ts` line 204: attempts REVIEW->DONE on agent story, mock returns 422 with appropriate error message |
| D2 | confirm-review API sets reviewedAt | **PASS** | `agent-review.spec.ts` line 116: clicking View Diff triggers confirm-review POST, verifies it was called |
| D3 | Approve button disabled until diff viewed | **PARTIAL** | `agent-review.spec.ts` line 94: checks button visibility and disabled state, but the assertion at line 111-113 only checks `isDisabled()` without a hard `expect(...).toBeDisabled()` assertion -- it catches but does not fail if the button is enabled before review |
| D4 | Diff viewer shows risk indicators | **PARTIAL** | `agent-review.spec.ts` line 282: mock diff contains `sk-secret-key-12345` and `console.log`, but the test at line 306-308 treats risk indicators as "optional UI" and passes as long as the diff viewer is visible, regardless of whether risks were flagged |

---

## E. Data Exposure Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| E1 | Public board doesn't expose private fields | **PASS** | `public-board.spec.ts` line 29: verifies comment input and agent logs tabs are not visible on public board |
| E2 | Private project returns 404 (no info leak) | **PASS** | `public-board.spec.ts` line 56: private project slug returns 404 |
| E3 | Error responses don't leak secrets | **FAIL** | No test verifies that error responses from the API use `sanitizeError()` or `stripSecrets()`. No test checks that stack traces are suppressed |
| E4 | Sensitive data not in URL parameters | **PARTIAL** | Password reset uses `?token=mock-reset-token` in URL (acceptable for reset tokens). No test checks that passwords, API keys, or session tokens are never in URLs |

---

## F. Test Hardcoded Secrets Check

| File | Finding | Severity | Assessment |
|------|---------|----------|------------|
| `e2e/fixtures/test-data.ts` | Passwords: `testpassword123`, `adminpassword123`, `memberpassword123`, `newuserpassword123` | **INFO** | Acceptable - these are test-only credentials for seeded test users, not production secrets |
| `e2e/seed-test-db.ts` | Same passwords hashed with bcrypt (10 rounds, not 12) | **LOW** | Test seed uses 10 rounds instead of the documented 12. Non-issue for test data but inconsistent with stated security policy |
| `e2e/two-factor-auth.spec.ts` | TOTP secret `JBSWY3DPEHPK3PXP` | **INFO** | Acceptable - this is a mock TOTP secret used in mocked API responses |
| `e2e/agent-review.spec.ts` | Mock diff contains `sk-secret-key-12345` | **INFO** | Intentional - this is test data specifically designed to trigger diff risk detection |
| `e2e/helpers/mock-session.ts` | `test-csrf-token` | **INFO** | Acceptable - mock CSRF token for test isolation |
| `e2e/auth.setup.ts` | Hardcoded `test@codepylot.dev` / `testpassword123` | **INFO** | Duplicates the test-data constants. Not a real credential |

**Verdict:** No real production credentials found in test files. All secrets are synthetic test data.

---

## G. Gaps Found - Missing Security Test Coverage

### CRITICAL Severity

| # | Gap | Description | Risk |
|---|-----|-------------|------|
| G1 | **Rate limiting behavior (429)** | No E2E test verifies that the middleware rate limiter (`middleware.ts` lines 46-67) returns 429 after exceeding 10 auth requests/min or 60 API requests/min. The rate limiter is implemented but entirely untested at the E2E level | An attacker could brute-force login credentials or overwhelm API endpoints if the rate limiter silently fails. The code even has a "fail-open" path (`rate-limit.ts` line 103) |
| G2 | **Server-side RBAC enforcement via API** | RBAC tests only verify UI-level enforcement (redirect/hidden buttons). No test sends direct API requests as MEMBER to admin-only endpoints (e.g., `DELETE /api/projects/[id]`, `PATCH /api/orgs/[id]`) to verify server-side `requireProjectAccess()` with role checks | A determined attacker could bypass UI restrictions by calling APIs directly. The `requireProjectAccess()` function supports role filtering (`options.roles`) but this is never tested |

### HIGH Severity

| # | Gap | Description | Risk |
|---|-----|-------------|------|
| G3 | **CSRF protection** | No test verifies CSRF tokens are required on state-changing requests. NextAuth includes CSRF protection, but no test confirms it works (e.g., submitting a form without the CSRF token should fail) | Cross-site request forgery could allow attackers to perform actions on behalf of authenticated users |
| G4 | **Cookie security flags** | No test inspects session cookies for `httpOnly`, `secure`, `sameSite` attributes. NextAuth JWT cookies should have these flags set | Cookie theft via XSS or cross-site leakage if flags are misconfigured |
| G5 | **Webhook SSRF prevention** | No test verifies that `isPublicUrl()` blocks internal/private IP addresses for webhook URLs. The CLAUDE.md documents this as a security feature but it has zero E2E coverage | Server-side request forgery could allow attackers to probe internal infrastructure |
| G6 | **2FA middleware enforcement** | No test verifies that a 2FA-enabled user who has not completed verification is blocked from accessing protected routes and APIs (`middleware.ts` lines 72-84 return 403 for API, redirect for pages) | 2FA bypass -- a user with valid session cookie but pending 2FA could access protected resources |
| G7 | **API key rotation and revocation** | No test covers API key generation, rotation, or revocation. The `hashApiKey()` function and SHA256 lookup are untested | Compromised API keys cannot be reliably rotated |
| G8 | **Cross-org IDOR with real data** | The IDOR test uses a non-existent project ID. No test authenticates as User A and attempts to access User B's actual project/stories/comments | Real IDOR vulnerabilities would only surface when accessing existing resources owned by a different org |

### MEDIUM Severity

| # | Gap | Description | Risk |
|---|-----|-------------|------|
| G9 | **Session fixation** | No test verifies that session tokens are regenerated after login. The `auth.setup.ts` performs login but doesn't check that pre-login session IDs differ from post-login ones | Session fixation attacks could allow account hijacking |
| G10 | **Content-Type validation** | No test sends requests with unexpected Content-Type headers (e.g., `text/plain` instead of `application/json`) to verify `parseJsonBody()` rejects them | Request smuggling or parser confusion attacks |
| G11 | **Error response sanitization** | No test triggers a server error and inspects the response body for stack traces, internal paths, or sensitive data. The `sanitizeError()` / `stripSecrets()` functions exist but are untested | Information disclosure through error messages |
| G12 | **Path traversal** | No test attempts path traversal payloads (`../`, `%2e%2e/`) in URL parameters or file references | Directory traversal could expose sensitive files |
| G13 | **Input size limits** | No test sends oversized payloads to verify `parseJsonBody()` size limits are enforced | Denial of service via large request bodies |
| G14 | **Concurrent session handling** | No test verifies behavior when the same user has multiple active sessions or when an org role is changed mid-session | Stale permissions in cached JWT tokens |

### LOW Severity

| # | Gap | Description | Risk |
|---|-----|-------------|------|
| G15 | **CORS headers** | No test inspects response headers for proper CORS configuration | Cross-origin data theft if CORS is misconfigured |
| G16 | **Security response headers** | No test checks for `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy` headers | Clickjacking, MIME sniffing, protocol downgrade attacks |
| G17 | **File upload validation** | No test for file upload endpoints (if any exist for attachments) | Malicious file upload |
| G18 | **Onboarding bypass** | No test verifies that the onboarding redirect (`middleware.ts` lines 87-95) cannot be bypassed by directly accessing API routes (the middleware excludes `/api/` paths from onboarding check) | New users could access API endpoints before completing onboarding |

---

## H. Test Architecture Observations

### Strengths

1. **Multi-role test infrastructure**: Separate auth setup for OWNER, ADMIN, and MEMBER users with proper role fixtures
2. **Route mocking pattern**: Consistent use of Playwright route interception to isolate frontend behavior
3. **Unauthenticated context isolation**: Proper use of empty `storageState` for tests requiring no auth
4. **Real database seeding**: `seed-test-db.ts` creates realistic multi-tenant data including roles, stories, sprints, and cross-org structures
5. **XSS test methodology**: Tests both script injection and event handler injection, checks both dialog events and DOM content

### Weaknesses

1. **Over-reliance on route mocking for security tests**: Many security tests mock the API response rather than hitting the real server. For example, the 422 trust gate test (`story-transitions.spec.ts` line 204) mocks the 422 response itself rather than letting the server enforce it. This means a regression in server-side enforcement would not be caught.
2. **Soft assertions**: Several security-critical assertions use `.catch(() => false)` patterns that silently pass when the element is not found, reducing test reliability (e.g., `agent-review.spec.ts` line 111)
3. **Missing API-level security tests**: All tests operate through the browser UI. No test uses `page.request.post()` or `page.request.delete()` to directly test server-side authorization on API routes
4. **bcrypt rounds inconsistency**: Seed uses 10 rounds (`hashSync("...", 10)`) but CLAUDE.md specifies 12 rounds

---

## I. Recommendations

### Priority 1: Add API-level authorization tests

```typescript
// Example: Direct API test for RBAC enforcement
test("MEMBER cannot delete project via direct API call", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: path.resolve(__dirname, ".auth/member.json"),
  });
  const page = await context.newPage();

  const response = await page.request.delete(
    `/api/projects/${TEST_PROJECT.id}`
  );
  expect([401, 403]).toContain(response.status());

  await context.close();
});
```

### Priority 2: Add rate limiting test

```typescript
test("auth endpoint returns 429 after 10 rapid requests", async ({ page }) => {
  const responses: number[] = [];
  for (let i = 0; i < 15; i++) {
    const res = await page.request.post("/api/auth/callback/credentials", {
      data: { email: "x@test.com", password: "wrong" },
    });
    responses.push(res.status());
  }
  expect(responses).toContain(429);
});
```

### Priority 3: Add cookie security flags test

```typescript
test("session cookie has httpOnly, secure, and sameSite flags", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // ... login ...
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c =>
    c.name.includes("authjs.session-token") || c.name.includes("next-auth.session-token")
  );
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie!.httpOnly).toBe(true);
  expect(sessionCookie!.sameSite).toBe("Lax");
  await context.close();
});
```

### Priority 4: Add 2FA middleware enforcement test

```typescript
test("2FA-enabled user cannot access /dashboard without verification", async ({ browser }) => {
  // Login as user with totpEnabled=true
  // After login, middleware should redirect to /verify-2fa
  // Verify that /api/projects returns 403 with "2FA verification required"
});
```

### Priority 5: Strengthen trust gate assertion

```typescript
// Replace soft assertion in agent-review.spec.ts line 111
// FROM:
const isDisabled = await approveBtn.isDisabled().catch(() => false);
// TO:
await expect(approveBtn).toBeDisabled();
```

### Priority 6: Add cross-org IDOR with real project IDs

```typescript
test("user from Org 2 cannot access Org 1 project via API", async ({ browser }) => {
  // Create a second user in Org 2 only
  // Authenticate as that user
  // Attempt to GET/PATCH /api/projects/test-project-id (belongs to Org 1)
  // Expect 401 or 403
});
```

### Priority 7: Harden bcrypt rounds in seed

In `e2e/seed-test-db.ts`, change `hashSync("...", 10)` to `hashSync("...", 12)` to match the documented security policy.

---

## J. Risk Summary

| Severity | Count | Key Items |
|----------|-------|-----------|
| CRITICAL | 2 | Rate limiting untested, server-side RBAC via API untested |
| HIGH | 6 | CSRF, cookie flags, SSRF, 2FA enforcement, API key lifecycle, cross-org IDOR |
| MEDIUM | 6 | Session fixation, Content-Type, error sanitization, path traversal, input size, concurrent sessions |
| LOW | 4 | CORS, security headers, file upload, onboarding bypass |

---

## K. Overall Security Verdict

### PASS WITH FINDINGS

The E2E test suite demonstrates security awareness and covers the most common attack vectors (XSS, basic IDOR, unauthenticated access, trust gate). The multi-role test infrastructure is well-designed. However, the **2 critical gaps** (rate limiting and server-side RBAC enforcement) and **6 high-severity gaps** represent real risk if the underlying server-side controls regress. The heavy reliance on mocked API responses means these tests validate frontend security behavior but do not provide confidence in server-side enforcement.

**Recommended next steps:**
1. Add API-level authorization tests that bypass the UI (Critical)
2. Add rate limiting verification test (Critical)
3. Add cookie and header security inspection tests (High)
4. Strengthen soft assertions to hard failures (High)
5. Consider adding integration-level security tests that hit real API endpoints without mocking
