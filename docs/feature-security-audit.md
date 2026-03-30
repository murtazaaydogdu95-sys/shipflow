# Feature Security Audit

**Author:** Security Auditor
**Date:** 2026-03-26
**Status:** Complete
**Scope:** All 16 proposed features, with deep audit on top 5

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Existing Security Posture](#existing-security-posture)
3. [Top 5 Features -- Deep Security Audit](#top-5-features--deep-security-audit)
4. [Higher-Risk Features -- Brief Security Review](#higher-risk-features--brief-security-review)
5. [Remaining Features -- Quick Security Scan](#remaining-features--quick-security-scan)
6. [Cross-Cutting Security Requirements](#cross-cutting-security-requirements)
7. [Summary Matrix](#summary-matrix)

---

## Executive Summary

I have audited all 16 proposed features against the existing security infrastructure in the codebase. The existing security posture is solid: AES-256-GCM encryption, SHA-256 API key hashing, RBAC with org-scoped permissions, edge-level rate limiting with IP extraction that correctly rejects X-Forwarded-For spoofing, and 2FA enforcement in middleware.

**Overall risk assessment of the top 5:**

| Feature | Risk Level | Key Concern |
|---|---|---|
| Board Search and Filters | LOW | URL parameter injection, ReDoS in search |
| Burndown Charts | LOW | Unbounded query DoS, data scoping |
| Cycle Time / Lead Time | LOW-MEDIUM | Expensive aggregation queries, information inference |
| Agent Performance Dashboard | MEDIUM | Rejection reason content leakage, sensitive metrics |
| Usage-Based AI Add-On Packs | HIGH | Race conditions in credit consumption, payment manipulation |

**Critical findings requiring mandatory safeguards:**

1. **AI Credit Packs**: Credit consumption has a TOCTOU race condition risk -- `checkRewriteLimit` and `creditsUsed` increment are not atomic
2. **Agent Performance Dashboard**: Rejection feedback messages may contain sensitive code snippets or security feedback that should be sanitized before display
3. **Analytics endpoints**: All three analytics features risk DoS via unbounded date ranges querying the Activity table at scale

---

## Existing Security Posture

Before assessing new features, here is what the codebase already provides:

### Strengths

| Control | Implementation | File |
|---|---|---|
| Auth | NextAuth v5 JWT with 2FA enforcement in middleware | `middleware.ts` |
| RBAC | 3-tier roles (OWNER/ADMIN/MEMBER) with 12 permissions | `permissions.ts` |
| Project access | `requireProjectAccess()` checks ProjectMember or API key match | `api-auth.ts` |
| API key security | SHA-256 hashed storage, plaintext fallback removed | `api-auth.ts` |
| Encryption | AES-256-GCM with random IV, proper auth tag handling | `encryption.ts` |
| Rate limiting | Edge middleware (IP-based) + Upstash Redis (fail-open) | `middleware.ts`, `rate-limit.ts` |
| IP extraction | Trusts only `x-real-ip` (platform-set), rejects `x-forwarded-for` | `middleware.ts` |
| Input parsing | `parseJsonBody()` with size limits | Convention |
| Error sanitization | `sanitizeError()` / `stripSecrets()` | Convention |
| SSRF prevention | `isPublicUrl()` for webhook/deploy URLs | Convention |

### Gaps Relevant to New Features

1. **No analytics-specific rate limiter**: The existing `apiRateLimit` (60/min) and `aiRateLimit` (10/min) do not distinguish expensive analytics queries from lightweight CRUD
2. **No query timeout mechanism**: Prisma queries have no explicit timeout, making DoS via expensive aggregation possible
3. **Rate limiter fails open**: When Redis is down, all requests are allowed (line 102-104 of `rate-limit.ts`) -- acceptable for general API but risky for payment operations
4. **`requireProjectAccess` does not check org membership**: It checks ProjectMember directly, which is correct for project-scoped data but analytics endpoints may need additional org-level scoping for billing features
5. **Middleware matcher excludes billing webhook**: `/api/billing/webhook` is excluded from rate limiting (line 101 of `middleware.ts`) -- this is correct for Paddle webhooks but must be verified for new credit pack webhook handling

---

## Top 5 Features -- Deep Security Audit

---

### 1. Board Search and Filters (#13)

**Architecture:** Client-side filtering of already-loaded story data. No new API endpoints. URL parameters for shareable filter states.

#### Authentication and Authorization

- **Risk: NONE** -- No new auth checks needed. Data is already loaded via the board page which uses `requireProjectAccess()`.
- **RBAC:** All roles (OWNER/ADMIN/MEMBER) already have `project:read` permission. No change needed.
- **IDOR risk:** None. Stories are already scoped to the project. Client-side filtering cannot expose cross-project data.

#### Data Exposure

- **Risk: NONE** -- Filtering operates on data already available to the user. No new data is fetched.
- **Saved filters:** The `SavedFilter` model already has `projectId` and `userId` scoping with a `@@index([projectId, userId])`. Filters from other users/projects are not exposed.

#### Input Validation

- **Risk: LOW** -- URL parameter manipulation
  - **Search query ReDoS:** If the search filter uses regex matching (e.g., `new RegExp(searchInput)`), a crafted search string like `(a+)+$` could cause catastrophic backtracking. Since filtering is client-side, this is a client-side DoS (browser tab freeze), not server-side. Still worth preventing.
  - **URL parameter injection:** Filter state synced to URL params could be manipulated. Since all filtering is client-side on already-authorized data, this cannot cause data leakage. However, malicious URL params shared with teammates could cause unexpected UI behavior.
  - **Date range filter:** `from`/`to` date strings must be validated as ISO dates. Invalid dates should be silently ignored, not cause exceptions.

#### Abuse Potential

- **Risk: NONE** -- No server-side impact. Cannot bypass tier limits. No API calls generated by filtering.

#### Required Safeguards

| Safeguard | Priority | Details |
|---|---|---|
| Use string `includes()` not `RegExp` for search | MUST | Avoid ReDoS. If regex is needed, use a library like `safe-regex` or escape special chars with `escapeRegExp()` |
| Validate date range params | SHOULD | Parse with `new Date()` and reject `NaN` results |
| Sanitize URL params on load | SHOULD | Discard unknown param keys; validate enum values (priorities, types, agent statuses) against allowed lists |
| Limit saved filter name length | SHOULD | Prevent excessively long filter names (max 100 chars) |

**Verdict: APPROVED -- Low risk. Implement the safeguards above.**

---

### 2. Burndown Charts (#16)

**Architecture:** New API endpoint `GET /api/projects/[projectId]/sprints/[sprintId]/burndown`. Reads Sprint, Story, and Activity data. Returns daily data points for chart rendering.

#### Authentication and Authorization

- **Risk: LOW**
- **MUST** use `requireProjectAccess(req, projectId)` on the new endpoint
- **MUST** verify that `sprintId` belongs to the given `projectId` -- otherwise an attacker could enumerate sprints from other projects by guessing sprint IDs (IDOR)
- **RBAC:** All roles should have access (it is read-only project data). `project:read` permission is sufficient.

#### Data Exposure

- **Risk: LOW**
- Response contains aggregated story point counts per day -- no individual story details, titles, or descriptions
- Sprint name and dates are exposed, which is acceptable for project members
- **Public board consideration:** If burndown data is ever exposed on public boards, it reveals velocity/capacity information. The architecture doc does not propose this, but it should be explicitly blocked. The public board whitelist (title, shortId, status, type, priority, storyPoints, labels) should NOT be extended to include burndown data.

#### Input Validation

- **Risk: LOW**
- `projectId` and `sprintId` are URL path parameters -- validate as non-empty strings (CUID format)
- No user-controlled query parameters in the proposed API

#### Abuse Potential

- **Risk: MEDIUM** -- Query cost
- The endpoint queries Activity records within a sprint date range. For long sprints (e.g., 6 months) with many stories, this could be expensive.
- An attacker could repeatedly hit this endpoint to stress the database.
- Mitigation: The existing `apiRateLimit` (60/min) provides some protection, but a dedicated analytics rate limit would be better.

#### Required Safeguards

| Safeguard | Priority | Details |
|---|---|---|
| `requireProjectAccess(req, projectId)` | MUST | Standard auth check |
| Verify sprint belongs to project | MUST | `prisma.sprint.findFirst({ where: { id: sprintId, projectId } })` -- return 404 if not found |
| Validate sprintId format | SHOULD | Reject if not CUID-shaped |
| Cap date range | SHOULD | If sprint duration exceeds 90 days, return error or truncate |
| Cache response | SHOULD | Burndown data for past sprints is immutable; cache with 5-minute TTL for active sprints |
| Block from public board API | MUST | Never expose burndown data via `/api/public/projects/[slug]` |

**Verdict: APPROVED -- Low risk with standard safeguards.**

---

### 3. Cycle Time / Lead Time Analytics (#8)

**Architecture:** New API endpoint `GET /api/projects/[projectId]/analytics/cycle-time?from=DATE&to=DATE&type=feature`. Aggregates Activity records to compute lead time, cycle time, throughput, and trend data.

#### Authentication and Authorization

- **Risk: LOW**
- **MUST** use `requireProjectAccess(req, projectId)`
- **RBAC:** `project:read` is sufficient. All roles should have access.
- **IDOR risk:** Low -- Activity records are scoped by `projectId` index. As long as the query filters by `projectId`, cross-project data cannot leak.

#### Data Exposure

- **Risk: LOW-MEDIUM**
- **Aggregated metrics are safe:** p50/p85/p95 lead times, cycle times, and throughput counts do not reveal individual story content
- **`byType` and `byPriority` breakdowns:** These reveal distribution patterns (e.g., "there are 47 bugs with average 12-hour cycle time") which is acceptable for project members but could be sensitive if leaked externally
- **Trend data:** Weekly rolling averages could reveal team capacity patterns -- acceptable for authenticated project members
- **The `type` query parameter** filters by story type. This should be validated against the known type enum (`feature`, `bug`, `chore`, `spike`) to prevent injection

#### Input Validation

- **Risk: MEDIUM**
- `from` and `to` query parameters are user-controlled date strings
  - **MUST** validate as ISO 8601 dates
  - **MUST** reject ranges exceeding 365 days to bound query cost
  - **MUST** reject `from > to`
  - **MUST** reject future dates beyond today (no useful data)
- `type` query parameter:
  - **MUST** validate against enum whitelist: `["feature", "bug", "chore", "spike"]`
  - Unrecognized values should return 400, not be silently passed to queries

#### Abuse Potential

- **Risk: MEDIUM** -- Expensive queries
- This endpoint performs multiple aggregation queries:
  1. Query completed stories in date range
  2. For each story, query Activity records to find first IN_PROGRESS transition
  3. Compute percentiles, group by type/priority, compute weekly throughput
- For projects with 10k+ stories and 50k+ Activity records, this is expensive
- An attacker could repeatedly request 365-day ranges to stress the database

#### Required Safeguards

| Safeguard | Priority | Details |
|---|---|---|
| `requireProjectAccess(req, projectId)` | MUST | Standard auth check |
| Validate `from`/`to` as ISO dates | MUST | Reject `NaN`, reject `from > to` |
| Cap date range to 365 days | MUST | Return 400 for ranges exceeding 1 year |
| Validate `type` against enum | MUST | Whitelist: `["feature", "bug", "chore", "spike"]` |
| Add analytics rate limiter | SHOULD | Separate from general API: 10 req/min per user for analytics endpoints |
| Add Prisma query timeout | SHOULD | `prisma.$queryRaw` with timeout or add `statement_timeout` at DB level |
| Cache results | SHOULD | Cache with 5-minute TTL keyed by `projectId + from + to + type` |
| Block from public API | MUST | Never expose cycle time data via public endpoints |

**Verdict: APPROVED -- Low-medium risk. Input validation and query bounding are mandatory.**

---

### 4. Agent Performance Dashboard (#6)

**Architecture:** New API endpoint `GET /api/projects/[projectId]/analytics/agent-performance?from=DATE&to=DATE`. Aggregates agent metrics from Story fields and Activity records. Includes rejection pattern analysis.

#### Authentication and Authorization

- **Risk: LOW**
- **MUST** use `requireProjectAccess(req, projectId)`
- **RBAC:** Consider restricting to OWNER/ADMIN only. Agent performance metrics (completion rate, rejection patterns) are operational data that MEMBERs may not need.
  - Recommendation: Allow all roles for summary metrics, but restrict `topRejectionReasons` to OWNER/ADMIN only, as rejection feedback may contain sensitive code review comments.

#### Data Exposure

- **Risk: MEDIUM** -- This is the highest data exposure risk among the analytics features
- **Summary metrics (counts, rates, durations):** Safe for all project members
- **Rejection reasons:** This is the critical concern. The architecture proposes parsing Activity messages containing "Review feedback:" to extract rejection patterns. These messages may contain:
  - Security vulnerabilities identified during review (e.g., "hardcoded API key in config.ts")
  - Code snippets from the codebase
  - Internal architecture details
  - References to specific files, functions, or credentials
- **`topRejectionReasons`** aggregates these into patterns. If a reviewer writes "Remove the hardcoded AWS_SECRET_ACCESS_KEY from deploy.ts", this becomes a visible rejection pattern.
- **Trend data:** Reveals agent system usage patterns -- acceptable for project members.

#### Input Validation

- **Risk: LOW-MEDIUM** -- Same date range concerns as cycle time
- `from`/`to` parameters: Same validation requirements as Feature #8
- No other user-controlled inputs

#### Abuse Potential

- **Risk: LOW-MEDIUM**
- Similar query cost concerns as cycle time analytics
- Agent stories are typically a smaller subset of all stories, so queries are bounded
- No plan limit bypass risk

#### Required Safeguards

| Safeguard | Priority | Details |
|---|---|---|
| `requireProjectAccess(req, projectId)` | MUST | Standard auth check |
| Sanitize rejection reasons | MUST | Strip file paths, credential patterns, and code snippets from rejection reason aggregation. Use the same 7 risk patterns from the diff viewer (secrets, eval, XSS, raw SQL, debug logging, env vars, TODOs) to redact sensitive content |
| Restrict `topRejectionReasons` to OWNER/ADMIN | SHOULD | Or sanitize heavily before showing to MEMBERs |
| Validate `from`/`to` date params | MUST | Same rules as Feature #8 |
| Cap date range to 365 days | MUST | Bound query cost |
| Truncate rejection messages | SHOULD | Limit to first 200 characters after sanitization |
| Add analytics rate limiter | SHOULD | 10 req/min per user |
| Block from public API | MUST | Agent performance data must never be publicly accessible |
| Audit log access | SHOULD | Log when agent performance data is accessed (sensitive operational metrics) |

**Verdict: APPROVED WITH CONDITIONS -- Rejection reason sanitization is mandatory before implementation.**

---

### 5. Usage-Based AI Add-On Packs (#2)

**Architecture:** New `AiCreditPack` schema model. Purchase endpoint via Paddle one-time payment. Modify `checkRewriteLimit()` to include credit pack balance. FIFO consumption of oldest pack first.

This is the highest-risk feature in the top 5 due to payment handling and credit consumption atomicity.

#### Authentication and Authorization

- **Risk: MEDIUM**
- **Purchase endpoint** (`POST /api/orgs/[orgId]/credit-packs/purchase`):
  - **MUST** verify the authenticated user is an OWNER or ADMIN of the org (`org:billing` permission)
  - **MUST** verify `orgId` matches the user's org membership -- IDOR risk if an attacker can purchase packs for another org (e.g., to drain their Paddle balance or trigger unexpected charges)
- **Balance endpoint** (`GET /api/orgs/[orgId]/credit-packs`):
  - **MUST** verify org membership (any role is acceptable for read-only balance)
- **Paddle webhook handler**:
  - **MUST** verify Paddle webhook signature before creating `AiCreditPack` records
  - The existing billing webhook path `/api/billing/webhook` is excluded from middleware rate limiting (line 101 of `middleware.ts`). This is correct for Paddle webhooks.

#### Data Exposure

- **Risk: LOW**
- Credit balance and pack history are visible to org members -- acceptable
- Transaction IDs from Paddle are stored but should not be exposed to frontend (they are billing internals)
- `priceId` is a Paddle internal identifier -- safe to store, should not be user-visible

#### Input Validation

- **Risk: MEDIUM**
- **Purchase request:** Must validate pack size against allowed values. Do NOT accept arbitrary credit counts from the client. The server must map a `packId` to a predefined pack size and Paddle price ID.
  ```
  VALID:   POST /credit-packs/purchase { "packId": "pack_10" }
  INVALID: POST /credit-packs/purchase { "credits": 999999, "price": 0 }
  ```
- **Webhook payload:** Paddle webhook payloads must be validated for:
  - Signature verification (HMAC)
  - Expected event type (`transaction.completed`)
  - `transactionId` uniqueness (prevent replay attacks)
  - `priceId` matches a known credit pack product

#### Abuse Potential

- **Risk: HIGH** -- This is the primary security concern

##### Race Condition in Credit Consumption (TOCTOU)

The proposed modification to `checkRewriteLimit()` has a time-of-check-time-of-use (TOCTOU) vulnerability:

```
1. Thread A: checkRewriteLimit() -> reads creditsUsed=9, credits=10, remaining=1 -> allowed=true
2. Thread B: checkRewriteLimit() -> reads creditsUsed=9, credits=10, remaining=1 -> allowed=true
3. Thread A: incrementCreditsUsed() -> creditsUsed=10
4. Thread B: incrementCreditsUsed() -> creditsUsed=11 (OVER-CONSUMED)
```

This allows consuming more credits than purchased. At scale, this could result in unbilled AI usage.

**Mitigation:** Use an atomic database operation:

```sql
UPDATE "AiCreditPack"
SET "creditsUsed" = "creditsUsed" + 1
WHERE id = $1
  AND "creditsUsed" < credits
  AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
RETURNING id;
```

If no rows are returned, the pack is exhausted. This is atomic at the database level.

Alternatively, use a Prisma transaction with serializable isolation:

```typescript
await prisma.$transaction(async (tx) => {
  const pack = await tx.aiCreditPack.findFirst({
    where: { orgId, creditsUsed: { lt: tx.aiCreditPack.fields.credits } },
    orderBy: { purchasedAt: 'asc' },
  });
  if (!pack || pack.creditsUsed >= pack.credits) throw new Error('No credits');
  await tx.aiCreditPack.update({
    where: { id: pack.id },
    data: { creditsUsed: { increment: 1 } },
  });
}, { isolationLevel: 'Serializable' });
```

##### Webhook Replay Attack

If Paddle webhook signature verification is missing or weak, an attacker could replay a `transaction.completed` webhook to create duplicate `AiCreditPack` records, granting free credits.

**Mitigation:** The `transactionId` field has `@unique` constraint, which prevents duplicate records. This is a good defense-in-depth. Additionally, always verify the Paddle webhook signature.

##### Credit Pack Expiry Manipulation

If `expiresAt` is set based on client input or can be modified via API, an attacker could extend pack expiry indefinitely.

**Mitigation:** `expiresAt` must be calculated server-side only, never accepted from client input. Set it based on the current billing period end date or a fixed 90-day window.

##### Plan Downgrade Credit Retention

If a user purchases credit packs on a PRO plan and then downgrades to FREE, do the credits remain? This is a business decision but has security implications: FREE users with purchased credits bypass the intended AI rewrite limit.

**Recommendation:** Credits should remain valid regardless of plan changes (they were paid for). But document this behavior explicitly.

#### Payment Security

| Check | Status | Details |
|---|---|---|
| Paddle webhook signature verification | MUST VERIFY | Check existing Paddle webhook handler for HMAC verification |
| Transaction ID uniqueness | ALREADY HANDLED | `@unique` constraint on `transactionId` |
| Idempotent credit creation | MUST IMPLEMENT | Use `upsert` with `transactionId` as unique key |
| Server-side pack size mapping | MUST IMPLEMENT | Never accept credit count from client |
| Atomic credit consumption | MUST IMPLEMENT | Use database-level atomicity (see above) |
| Credit expiry server-side only | MUST IMPLEMENT | Never accept `expiresAt` from client |

#### Required Safeguards

| Safeguard | Priority | Details |
|---|---|---|
| `requireOrgPermission(userId, orgId, 'org:billing')` for purchase | MUST | Only OWNER/ADMIN can purchase |
| Verify org membership for balance read | MUST | Any role, but must be a member |
| Paddle webhook signature verification | MUST | HMAC-SHA256 of webhook payload |
| Atomic credit consumption | MUST | Use `$queryRaw` with atomic UPDATE or serializable transaction |
| Server-side pack size mapping | MUST | Hardcoded pack definitions: `{ pack_10: { credits: 10, priceId: '...' } }` |
| Idempotent webhook handling | MUST | `upsert` with `transactionId` as unique key |
| Do not expose `transactionId` or `priceId` to frontend | SHOULD | Return only `id`, `credits`, `creditsUsed`, `purchasedAt`, `expiresAt` |
| Audit log credit purchases | MUST | Create AuditLog entry for every purchase and consumption |
| Rate limit purchase endpoint | SHOULD | 5 req/min per user to prevent purchase spam |
| Monitor credit consumption anomalies | SHOULD | Alert if a single org consumes more than 100 credits/hour |

**Verdict: APPROVED WITH CONDITIONS -- Atomic credit consumption and webhook signature verification are mandatory. Do NOT ship without the TOCTOU fix.**

---

## Higher-Risk Features -- Brief Security Review

### Jira/Linear Import (#4)

**Risk Level: MEDIUM-HIGH**

| Concern | Assessment |
|---|---|
| **External API credentials** | Users provide Jira/Linear API keys for import. These must be encrypted with `encrypt()` from `encryption.ts` if stored, or held only in memory during the import session and discarded immediately. Prefer ephemeral usage. |
| **Data ingestion** | Imported stories must be validated and sanitized. Jira stories may contain HTML/Markdown with XSS payloads in descriptions. All imported text must be sanitized before storage. |
| **Plan limit bypass** | Bulk import could bypass `checkStoryLimit()` if limits are checked once at the start rather than per-story. **MUST** check limits atomically during batch creation, or pre-check `currentCount + importCount <= limit`. |
| **Import size DoS** | A user could attempt to import 100k stories. **MUST** cap import size (e.g., 500 stories per import) and use batch processing with progress tracking. |
| **SSRF via Jira URLs** | If the import fetches attachments from Jira-provided URLs, those URLs must be validated with `isPublicUrl()` to prevent SSRF. |
| **Required safeguards** | Encrypt or discard API keys after use; sanitize imported HTML; enforce plan limits during import; cap import size; validate attachment URLs |

### Slack/Discord Integration (#3)

**Risk Level: MEDIUM-HIGH**

| Concern | Assessment |
|---|---|
| **OAuth token storage** | Slack/Discord OAuth access tokens and refresh tokens must be encrypted with `encrypt()`. Never store in plaintext. |
| **OAuth token refresh** | Token refresh must be handled server-side. Expired tokens should trigger re-authorization, not silent failure. |
| **Webhook URL validation** | Discord webhook URLs must be validated with `isPublicUrl()` to prevent SSRF. |
| **Message content leakage** | Notifications sent to Slack/Discord channels may contain story titles, descriptions, or review feedback. Ensure no secrets or sensitive data (API keys, credentials) are included in notification messages. Apply `stripSecrets()` to all notification content. |
| **Channel access verification** | After OAuth, verify the bot/webhook has access to the selected channel. Do not allow users to specify arbitrary channel IDs that the bot may have access to in other workspaces. |
| **Token revocation** | Provide a way to revoke integration tokens (delete from DB, call Slack/Discord revoke endpoint). |
| **Required safeguards** | Encrypt tokens with `encrypt()`; validate webhook URLs; sanitize notification content; verify channel access; implement token revocation |

### GitLab/Bitbucket Integration (#12)

**Risk Level: HIGH**

| Concern | Assessment |
|---|---|
| **Multi-provider credential storage** | Each provider requires different credential types (GitLab PAT, Bitbucket app password, OAuth tokens). All must be encrypted with `encrypt()`. |
| **Git credential exposure** | The agent system uses `execFileSync("git", ...)` for shell operations. Git credentials must never be passed as CLI arguments (visible in process listings). Use git credential helpers or environment variables. |
| **Merge request API differences** | GitLab/Bitbucket MR APIs have different permission models. Ensure the app only performs actions the user has authorized. |
| **Webhook receiver security** | GitLab/Bitbucket push webhooks need separate signature verification schemes (GitLab uses `X-Gitlab-Token`, Bitbucket uses HMAC). |
| **Required safeguards** | Encrypt all provider credentials; never pass credentials as CLI args; verify provider-specific webhook signatures; scope API access to minimum permissions |

### Agent Auto-Test Generation (#9)

**Risk Level: VERY HIGH**

| Concern | Assessment |
|---|---|
| **Code execution** | Running auto-generated tests means executing arbitrary code on the server or CI environment. This is a sandbox escape vector. |
| **Supply chain attacks** | Agent-generated tests may import malicious packages or require network access. Test execution must be sandboxed (Docker container, isolated filesystem). |
| **Resource exhaustion** | Tests may contain infinite loops, excessive memory allocation, or fork bombs. **MUST** enforce CPU/memory/time limits on test execution. |
| **Filesystem access** | Tests must not be able to read `/etc/passwd`, environment variables, or other sensitive system files. Use a minimal sandbox with no access to host filesystem. |
| **Required safeguards** | Containerized test execution with resource limits; no host filesystem access; no network access during test runs; kill tests after 60-second timeout; never run tests with host-level credentials |

### Custom Fields (#11)

**Risk Level: MEDIUM**

| Concern | Assessment |
|---|---|
| **Stored XSS** | Custom field values (especially text and select types) can contain XSS payloads. All field values must be sanitized on input and escaped on output. |
| **Dynamic query injection** | Filtering/sorting by custom fields requires dynamic query building. This must use parameterized queries, not string concatenation. Never use `$queryRawUnsafe`. |
| **EAV data isolation** | `CustomFieldValue` records must be scoped by storyId -> projectId. Ensure no cross-project field value leakage through direct ID access. |
| **Field definition manipulation** | Users could create thousands of custom fields as a DoS vector. Cap at 20-50 fields per project. |
| **Required safeguards** | Sanitize all field values; use parameterized queries for filtering; scope field values by project; cap field count per project; validate field type enum |

---

## Remaining Features -- Quick Security Scan

### Seat-Based Pricing + Annual Billing (#1)

- **Risk: MEDIUM** -- Seat enforcement at OrgMember creation is a new authorization boundary. Must prevent adding members beyond seat limit. Race condition risk similar to credit packs (two concurrent member additions).
- **Safeguard:** Atomic seat count check with `UPDATE ... WHERE seatCount < maxSeats`.

### Real-Time Board Updates / SSE (#5)

- **Risk: MEDIUM** -- SSE connections must be authenticated per-connection, not just at connection time. If a user is removed from a project, their SSE connection must be terminated. Event payloads must be scoped to the user's project access.
- **Safeguard:** Verify auth on each event push, not just connection establishment. Implement connection cleanup on permission changes.

### Keyboard Shortcuts (#7)

- **Risk: NONE** -- Pure client-side UI feature. No security implications.

### Epics and Milestones (#10)

- **Risk: LOW** -- Standard CRUD with `requireProjectAccess()`. Ensure epic data is not exposed on public boards.
- **Safeguard:** Standard auth checks. Add `epicId` to the public board field exclusion list.

### Story Templates (#14)

- **Risk: LOW** -- Templates with `projectId: null` (global templates) must be read-only for non-admin users. Template content (description, acceptance criteria) could contain XSS if rendered as HTML.
- **Safeguard:** Sanitize template content on creation. Restrict global template creation to system admins.

### Inline Card Editing (#15)

- **Risk: LOW** -- Uses existing PATCH story endpoint. Double-click to edit is a UI change. Right-click context menu actions must go through the same auth-checked API endpoints.
- **Safeguard:** No new safeguards needed beyond existing story PATCH auth.

### Burndown Charts (#16)

- Covered in top 5 deep audit above.

---

## Cross-Cutting Security Requirements

These requirements apply to ALL new features:

### 1. Analytics Rate Limiting

Create a dedicated analytics rate limiter separate from the general API limiter:

```typescript
// In rate-limit.ts
export const analyticsRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  prefix: "rl:analytics"
});
```

Apply to: Burndown (`#16`), Cycle Time (`#8`), Agent Performance (`#6`).

### 2. Date Range Validation Schema

Create a shared Zod schema for date range parameters used by all analytics endpoints:

```typescript
// In src/lib/validations/analytics.ts
import { z } from 'zod';

export const dateRangeSchema = z.object({
  from: z.string().datetime().refine(d => new Date(d) <= new Date(), 'Cannot be in the future'),
  to: z.string().datetime().refine(d => new Date(d) <= new Date(), 'Cannot be in the future'),
}).refine(
  d => new Date(d.to) >= new Date(d.from),
  'End date must be after start date'
).refine(
  d => (new Date(d.to).getTime() - new Date(d.from).getTime()) <= 365 * 24 * 60 * 60 * 1000,
  'Date range cannot exceed 365 days'
);
```

### 3. Query Cost Protection

For all endpoints that aggregate Activity records, add a query cost guard:

- Count matching records before performing aggregation
- If count exceeds 50,000, return 422 with a message suggesting a narrower date range
- Alternatively, set a PostgreSQL `statement_timeout` of 10 seconds for analytics queries

### 4. Public Board Data Boundary

The public board currently exposes only: `title, shortId, status, type, priority, storyPoints, labels`. New features must NOT extend this whitelist. Specifically:

- Burndown data: NOT public
- Cycle time metrics: NOT public
- Agent performance: NOT public
- Credit pack balance: NOT public
- Rejection patterns: NOT public

### 5. Audit Logging for New Endpoints

All new endpoints that modify data must create AuditLog entries:

| Action | When |
|---|---|
| `CREDIT_PACK_PURCHASED` | Credit pack created via webhook |
| `CREDIT_CONSUMED` | AI rewrite uses a credit pack credit |
| `ANALYTICS_EXPORTED` | If analytics export is added later |

Read-only analytics endpoints do not need audit logging unless they expose sensitive data (agent performance rejection reasons should be logged).

### 6. Error Response Standardization

All new API endpoints must use `sanitizeError()` for error responses. Never expose:
- Database error messages (Prisma error details)
- Stack traces
- Internal IDs from other orgs/projects
- Query parameters from failed lookups

---

## Summary Matrix

| # | Feature | Risk | Auth | Data Exposure | Input Val | Abuse | Payment | Verdict |
|---|---|---|---|---|---|---|---|---|
| 13 | Board Search/Filters | LOW | None needed | None | ReDoS risk | None | N/A | APPROVED |
| 16 | Burndown Charts | LOW | Standard | Low (aggregates) | Path params | Query DoS | N/A | APPROVED |
| 8 | Cycle Time Analytics | LOW-MED | Standard | Low-Med | Date ranges | Query DoS | N/A | APPROVED |
| 6 | Agent Performance | MEDIUM | Standard + role gate | Medium (rejections) | Date ranges | Query DoS | N/A | APPROVED WITH CONDITIONS |
| 2 | AI Credit Packs | HIGH | Org billing perm | Low | Pack ID only | TOCTOU race | Webhook sig, atomicity | APPROVED WITH CONDITIONS |
| 4 | Jira/Linear Import | MED-HIGH | Standard | Med (ingestion) | Bulk data | Plan bypass | N/A | NEEDS SAFEGUARDS |
| 3 | Slack/Discord | MED-HIGH | OAuth | Med (tokens) | URLs | Token abuse | N/A | NEEDS SAFEGUARDS |
| 12 | GitLab/Bitbucket | HIGH | Multi-provider | High (credentials) | Git ops | Credential leak | N/A | DEFER -- HIGH RISK |
| 9 | Agent Auto-Test | VERY HIGH | Standard | High (code exec) | Generated code | Sandbox escape | N/A | DEFER -- VERY HIGH RISK |
| 11 | Custom Fields | MEDIUM | Standard | Med (XSS) | Dynamic queries | Field spam | N/A | NEEDS SAFEGUARDS |
| 1 | Seat-Based Pricing | MEDIUM | Billing perm | Low | Seat count | Race condition | Paddle | NEEDS SAFEGUARDS |
| 5 | Real-Time SSE | MEDIUM | Per-connection | Low | None | Connection DoS | N/A | NEEDS SAFEGUARDS |
| 7 | Keyboard Shortcuts | NONE | None | None | None | None | N/A | APPROVED |
| 10 | Epics/Milestones | LOW | Standard | Low | CRUD | None | N/A | APPROVED |
| 14 | Story Templates | LOW | Standard | Low (XSS) | Template content | None | N/A | APPROVED |
| 15 | Inline Card Editing | LOW | Existing | None | None | None | N/A | APPROVED |

---

**Mandatory blockers before implementation begins:**

1. Feature #2 (AI Credit Packs): Implement atomic credit consumption before writing the `checkRewriteLimit()` modification
2. Feature #6 (Agent Performance): Implement rejection reason sanitization before exposing `topRejectionReasons`
3. All analytics features (#6, #8, #16): Create shared date range validation schema and analytics rate limiter

**End of Security Audit.**
