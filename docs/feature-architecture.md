# Feature Architecture Assessment

**Author:** Architect
**Date:** 2026-03-26
**Status:** Draft for PM Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [All 16 Features — Feasibility Assessment](#all-16-features--feasibility-assessment)
3. [Priority Matrix](#priority-matrix)
4. [Top 5 Features — Detailed Architecture](#top-5-features--detailed-architecture)
5. [Dependency Graph](#dependency-graph)
6. [Risk Register](#risk-register)

---

## Executive Summary

After reviewing the codebase (schema, billing, agent system, board component, analytics, webhook infrastructure), I have assessed all 16 features and selected the top 5 based on impact-to-effort ratio. The existing architecture is well-structured for extension: Activity records enable analytics features with minimal schema changes, the board component already has client-side filtering and keyboard navigation, and the Paddle billing integration is clean enough to support new pricing models.

**Top 5 Recommended (highest impact-to-effort ratio):**

1. **Board Search and Filters** (#13) -- already 80% done, needs polish
2. **Burndown Charts** (#16) -- leverages existing Sprint/Story data + recharts
3. **Cycle Time / Lead Time Analytics** (#8) -- Activity records already capture all transitions
4. **Agent Performance Dashboard** (#6) -- Activity records + Story agent fields are sufficient
5. **Usage-Based AI Add-On Packs** (#2) -- clean billing extension, direct revenue

---

## All 16 Features -- Feasibility Assessment

### 1. Seat-Based Pricing + Annual Billing

| Dimension | Assessment |
|---|---|
| **Feasibility** | MODERATE |
| **PM Estimate** | 2-3 weeks |
| **Architect Estimate** | 3-4 weeks |
| **Required Changes** | Schema: add `seatCount`, `billingCycle` to Subscription; add `OrgSeatUsage` tracking model. API: new seat management endpoints, Paddle webhook handlers for seat changes. Frontend: billing settings UI, seat management page. Infra: Paddle product/price reconfiguration for per-seat pricing. |
| **Dependencies** | Paddle must support quantity-based subscriptions (it does). Current Subscription model needs `quantity` field. |
| **Risks** | Paddle sandbox testing is slow. Migration of existing subscribers requires careful handling. Seat enforcement at OrgMember creation adds a new validation layer. Annual billing discount calculations add complexity. |
| **Reuse** | `plan-limits.ts` pattern, existing Paddle webhook handler, `OrgMember` model. |
| **Adjusted Priority** | MEDIUM -- high revenue impact but high effort; defer until after quick wins ship. |

### 2. Usage-Based AI Add-On Packs

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 3-5 days |
| **Architect Estimate** | 3-5 days (accurate) |
| **Required Changes** | Schema: add `AiCreditPack` model (orgId, credits, purchasedAt, expiresAt). API: purchase endpoint, modify `checkRewriteLimit()` to include purchased credits. Frontend: credit pack purchase button in settings, usage meter. |
| **Dependencies** | None -- standalone billing feature. |
| **Risks** | Low. Credit counting is additive to existing `checkRewriteLimit()` logic. Paddle one-time purchase flow is straightforward. |
| **Reuse** | `checkRewriteLimit()` in `plan-limits.ts` already counts Activity records. Just add credit pack balance. `paddle.ts` already handles Paddle integration. |
| **Adjusted Priority** | HIGH -- direct revenue, low effort, clean implementation path. |

### 3. Slack/Discord Integration

| Dimension | Assessment |
|---|---|
| **Feasibility** | MODERATE |
| **PM Estimate** | 2 weeks |
| **Architect Estimate** | 2-3 weeks |
| **Required Changes** | Schema: `Integration` model (orgId, type, accessToken, channelId, config). API: OAuth callback routes for Slack/Discord, channel selection endpoint. Modify `dispatchWebhook()` to also dispatch to integrations, or create parallel `dispatchNotification()`. Frontend: integration settings page with OAuth flow. |
| **Dependencies** | Slack/Discord app registration. OAuth token storage requires encryption via existing `encryption.ts`. |
| **Risks** | OAuth token refresh handling. Slack rate limits (1 msg/sec per channel). Discord webhook vs bot approach decision. Token storage security. |
| **Reuse** | `webhooks.ts` dispatch pattern, `encryption.ts` for token storage, Activity system for event sourcing. |
| **Adjusted Priority** | MEDIUM -- good retention value but meaningful effort. |

### 4. Jira/Linear Import

| Dimension | Assessment |
|---|---|
| **Feasibility** | MODERATE |
| **PM Estimate** | 2-3 weeks |
| **Architect Estimate** | 2-3 weeks (accurate) |
| **Required Changes** | Schema: none (stories map directly). API: import endpoints with Jira/Linear API clients, field mapping logic, batch story creation. Frontend: import wizard with field mapping UI, progress indicator. |
| **Dependencies** | Jira Cloud REST API v3 access. Linear GraphQL API. API key input from user (no OAuth needed for import). |
| **Risks** | Jira custom field complexity. Large imports (1000+ stories) need batching and progress tracking. Story point mapping varies across tools. Label/status mapping is lossy. |
| **Reuse** | Existing `StoryImportDialog` for CSV/JSON. Story creation API. `checkStoryLimit()` for plan enforcement during import. |
| **Adjusted Priority** | MEDIUM -- reduces churn at onboarding, but narrow audience (teams migrating). |

### 5. Real-Time Board Updates (SSE)

| Dimension | Assessment |
|---|---|
| **Feasibility** | HARD |
| **PM Estimate** | 3-4 weeks |
| **Architect Estimate** | 3-4 weeks (accurate) |
| **Required Changes** | API: SSE endpoint at `/api/projects/[projectId]/events`. Backend: event emission from all story mutation endpoints. Infra: SSE connection management, reconnection logic, Redis pub/sub for multi-instance. Frontend: replace 15s polling in `kanban-board.tsx` with EventSource. |
| **Dependencies** | Redis pub/sub (already have @upstash/redis). Vercel serverless has SSE limitations (30s timeout on hobby, 5min on Pro). |
| **Risks** | Vercel serverless SSE timeout is a hard constraint. May require WebSocket upgrade or third-party service (Ably, Pusher). Connection management at scale. Memory pressure from open connections. The current 15s polling is "good enough" for most teams. |
| **Reuse** | Board polling logic in `kanban-board.tsx` (lines 100-170) can be replaced. |
| **Adjusted Priority** | LOW -- high effort, Vercel constraints make this harder than it looks, and current polling works adequately. |

### 6. Agent Performance Dashboard

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 2 weeks |
| **Architect Estimate** | 1-1.5 weeks |
| **Required Changes** | Schema: none -- all data exists in Activity records (AGENT_TRIGGERED, STORY_MOVED) and Story fields (agentStatus, agentTriggeredAt, reviewedAt). API: one analytics endpoint aggregating agent metrics. Frontend: new dashboard tab with recharts visualizations. |
| **Dependencies** | None. |
| **Risks** | Low. Query performance on large Activity tables -- mitigated by existing indexes on `[projectId, createdAt]`. |
| **Reuse** | Existing analytics page pattern. `recharts` already installed. Activity model indexes. Sprint velocity chart component pattern. |
| **Adjusted Priority** | HIGH -- differentiating feature, low effort, data already exists. |

### 7. Keyboard Shortcuts System

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 3-4 days |
| **Architect Estimate** | 2-3 days |
| **Required Changes** | Schema: none. API: none. Frontend: global keyboard handler component, shortcuts help modal (Cmd+?), integration with existing Quick Capture (Cmd+K already exists). |
| **Dependencies** | None. |
| **Risks** | Minimal. Must avoid conflicts with browser shortcuts. The board already has arrow key navigation (lines 430-504 of kanban-board.tsx). |
| **Reuse** | Board keyboard handler pattern already implemented. Quick capture Cmd+K exists. |
| **Adjusted Priority** | MEDIUM -- nice polish but limited impact on retention/revenue. Can ship as part of a broader UX sprint. |

### 8. Cycle Time / Lead Time Analytics

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 1-2 weeks |
| **Architect Estimate** | 1-1.5 weeks |
| **Required Changes** | Schema: none -- Activity records already log STORY_MOVED with timestamps. API: analytics endpoint that computes lead time (created -> DONE) and cycle time (IN_PROGRESS -> DONE) from Activity records. Frontend: chart components using recharts, percentile displays (p50, p85, p95). |
| **Dependencies** | None. |
| **Risks** | Low. Activity table queries may be slow for projects with 10k+ activities. Add date range filtering to bound queries. |
| **Reuse** | Activity model with `[projectId, createdAt]` index. Existing analytics page. recharts. |
| **Adjusted Priority** | HIGH -- DORA metrics are a strong selling point for engineering teams. Low effort. |

### 9. Agent Auto-Test Generation

| Dimension | Assessment |
|---|---|
| **Feasibility** | HARD |
| **PM Estimate** | 4-6 weeks |
| **Architect Estimate** | 6-8 weeks |
| **Required Changes** | Schema: add test file tracking fields to Story. Agent system: extend agent prompt in `agent-executor.ts` to include test generation instructions, add MCP tool for test execution. Test runner integration: spawn vitest/jest in agent working directory, parse results. Frontend: test results display in story detail modal. |
| **Dependencies** | Reliable agent code generation (current system). Test framework detection per project. |
| **Risks** | HIGH. Agent-generated tests are often brittle or trivial. Test execution in arbitrary codebases is unpredictable. Security risk of running arbitrary test code. False confidence from auto-generated tests. PM estimate is optimistic -- this needs significant prompt engineering and test quality validation. |
| **Reuse** | `agent-executor.ts` spawn pattern. MCP server tools. |
| **Adjusted Priority** | LOW -- high effort, high risk, quality concerns. Better as a v2 feature after agent system matures. |

### 10. Epics and Milestones

| Dimension | Assessment |
|---|---|
| **Feasibility** | MODERATE |
| **PM Estimate** | 3-4 weeks |
| **Architect Estimate** | 3-4 weeks (accurate) |
| **Required Changes** | Schema: `Epic` model (projectId, title, description, status, startDate, targetDate), add `epicId` to Story. API: CRUD endpoints for epics, epic progress aggregation. Frontend: epic list/board view, epic detail with story list, progress bars, milestone timeline. |
| **Dependencies** | Story `parentId` already exists for sub-tasks but is not the same as epic grouping. Separate model needed. |
| **Risks** | Scope creep -- epics often lead to roadmap views, gantt charts, cross-project epics. Must scope tightly to single-project epics. |
| **Reuse** | Story CRUD pattern. Board component pattern. Sprint model as reference for date-bounded containers. |
| **Adjusted Priority** | MEDIUM -- useful for larger teams but adds complexity for solo/small teams who are the primary audience. |

### 11. Custom Fields on Stories

| Dimension | Assessment |
|---|---|
| **Feasibility** | HARD |
| **PM Estimate** | 4-6 weeks |
| **Architect Estimate** | 5-7 weeks |
| **Required Changes** | Schema: `CustomFieldDefinition` (projectId, name, type, options, required), `CustomFieldValue` (storyId, fieldId, value). API: field definition CRUD, value get/set with type validation. Frontend: dynamic form rendering, field management UI, filter/sort by custom fields. |
| **Dependencies** | None, but touches many surfaces (story creation, editing, filtering, export, import, public board). |
| **Risks** | Type system complexity (text, number, date, select, multi-select, user). Performance of EAV pattern at scale. Filter/sort by custom fields requires dynamic query building. Migration of existing data. |
| **Reuse** | Story CRUD pattern. Board filters (would need extension). Zod validation. |
| **Adjusted Priority** | LOW -- high effort, niche demand at current stage. Better to add specific fields (like "due date") as concrete schema columns. |

### 12. GitLab/Bitbucket Integration

| Dimension | Assessment |
|---|---|
| **Feasibility** | VERY HARD |
| **PM Estimate** | 6-8 weeks |
| **Architect Estimate** | 8-10 weeks |
| **Required Changes** | Schema: `GitProvider` model, abstract `githubRepo` into provider-agnostic `gitRepo`. Agent system: abstract `ensureBranch()` to support GitLab/Bitbucket APIs. API: OAuth flows for each provider, webhook receivers for push/PR events. Frontend: provider selection in project settings. |
| **Dependencies** | Fundamental refactor of agent-executor git operations from shell-based to API-based for non-GitHub providers. |
| **Risks** | VERY HIGH. The agent system (`agent-executor.ts`) uses `execFileSync("git", ...)` which works with any git remote, BUT the PR creation, preview, and review flows are GitHub-specific. GitLab/Bitbucket have different API shapes for merge requests. This is a large abstraction effort. |
| **Reuse** | `ensureBranch()` git operations are provider-agnostic at the git CLI level. |
| **Adjusted Priority** | LOW -- massive effort, most early adopters use GitHub. Defer to when market demands it. |

### 13. Board Search and Filters

| Dimension | Assessment |
|---|---|
| **Feasibility** | ALREADY EXISTS (polish needed) |
| **PM Estimate** | 3-4 days |
| **Architect Estimate** | 1-2 days |
| **Required Changes** | The board already has `BoardFilters` component with search, priority, type, label, and assignee filtering (lines 399-427 of kanban-board.tsx). `SavedFilters` component exists. What remains: sprint filter, date range filter, agent status filter, and UI polish. |
| **Dependencies** | None. |
| **Risks** | None. |
| **Reuse** | `BoardFilters`, `SavedFilters`, `filterStories()` callback -- all exist. |
| **Adjusted Priority** | VERY HIGH -- nearly free, just needs polish and a few additional filter types. |

### 14. Story Templates Library

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 2-3 days |
| **Architect Estimate** | 2-3 days (accurate) |
| **Required Changes** | Schema: `StoryTemplate` model (projectId or null for global, title, description, type, priority, acceptanceCriteria JSON). API: template CRUD, "create story from template" endpoint. Frontend: template picker in story creation flow, template management page. |
| **Dependencies** | None. |
| **Risks** | Minimal. Template acceptance criteria format must match AcceptanceCriterion model. |
| **Reuse** | Story creation flow. Quick capture component. |
| **Adjusted Priority** | MEDIUM -- useful but not a differentiator. Good for a quick win sprint. |

### 15. Inline Card Editing

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 3-4 days |
| **Architect Estimate** | 2-3 days |
| **Required Changes** | Schema: none. API: none (PATCH story endpoint exists). Frontend: add double-click handler to `StoryCard`, inline title input, right-click context menu with common actions (change priority, assign, delete). |
| **Dependencies** | None. |
| **Risks** | Minimal. Must handle DnD vs double-click interaction carefully (already have 8px activation distance on PointerSensor). |
| **Reuse** | Story PATCH API. `StoryCard` component. `handleStoryUpdated` callback. |
| **Adjusted Priority** | MEDIUM -- nice UX improvement but not a driver of conversion or retention. |

### 16. Burndown Charts

| Dimension | Assessment |
|---|---|
| **Feasibility** | EASY |
| **PM Estimate** | 4-5 days |
| **Architect Estimate** | 3-4 days |
| **Required Changes** | Schema: none -- Sprint model has startDate/endDate, stories have storyPoints and status, Activity records have timestamps for status transitions. API: burndown data endpoint that computes ideal vs actual burn from Activity records within sprint date range. Frontend: recharts AreaChart component on analytics page. |
| **Dependencies** | Sprints with dates must be populated. |
| **Risks** | Low. Edge case: stories added/removed mid-sprint change the ideal line. Activity timestamps may have gaps if stories were moved outside the app. |
| **Reuse** | `VelocityChart` component pattern. recharts. Sprint model. Activity-based time series queries. Existing analytics page layout. |
| **Adjusted Priority** | HIGH -- complements existing velocity chart, low effort, strong value for sprint-based teams. |

---

## Priority Matrix

### Quadrant View

```
                    HIGH IMPACT
                        |
     Q1: DO NOW         |        Q2: PLAN NEXT
                        |
  #13 Board Filters*    |  #2 AI Add-On Packs
  #16 Burndown Charts   |  #6 Agent Dashboard
  #8  Cycle Time        |  #1 Seat-Based Pricing
                        |  #3 Slack/Discord
                        |
  ------LOW EFFORT------+------HIGH EFFORT------
                        |
  #7  Keyboard Shortcuts|  #10 Epics/Milestones
  #14 Story Templates   |  #4  Jira/Linear Import
  #15 Inline Editing    |  #5  Real-Time SSE
                        |  #9  Agent Auto-Tests
     Q3: FILL IN        |  #11 Custom Fields
                        |  #12 GitLab/Bitbucket
                        |
                    LOW IMPACT   Q4: AVOID (for now)
```

*#13 is nearly complete -- just needs polish.

### Recommended Build Order

| Phase | Features | Timeline |
|---|---|---|
| **Sprint 1** (1 week) | #13 Board Filter Polish, #16 Burndown Charts | Week 1 |
| **Sprint 2** (1.5 weeks) | #8 Cycle Time Analytics, #6 Agent Performance Dashboard | Week 2-3 |
| **Sprint 3** (1 week) | #2 Usage-Based AI Add-On Packs | Week 3-4 |
| **Sprint 4** (1 week) | #7 Keyboard Shortcuts, #15 Inline Editing, #14 Templates | Week 4-5 |
| **Sprint 5** (3 weeks) | #1 Seat-Based Pricing | Week 5-8 |
| **Sprint 6** (2-3 weeks) | #3 Slack/Discord Integration | Week 8-10 |
| **Backlog** | #4, #5, #9, #10, #11, #12 | Revisit after Sprint 6 |

---

## Top 5 Features -- Detailed Architecture

---

### Feature #13: Board Search and Filters (Polish)

**Current State:** `BoardFilters` component exists with search, priority, type, label, and assignee filters. `SavedFilters` with persistence exists. `filterStories()` callback in `kanban-board.tsx` (lines 399-427) handles client-side filtering.

**What Remains:**

#### Additional Filters

```typescript
// Extend BoardFilterState in board-filters.tsx
interface BoardFilterState {
  search: string;
  priorities: string[];
  types: string[];
  labelIds: string[];
  assigneeIds: string[];
  // NEW:
  sprintId: string | null;        // filter by sprint
  agentStatuses: string[];        // RUNNING, COMPLETED, FAILED, null
  dateRange: {                    // created/updated date range
    from: string | null;
    to: string | null;
  } | null;
  hasAgent: boolean | null;       // true = agent stories only, false = manual only
}
```

#### Frontend Changes

- Add sprint selector dropdown to `BoardFilters` (sprints already loaded by board page)
- Add agent status filter chips (Running, Completed, Failed)
- Add date range picker using a simple from/to input pair
- Extend `filterStories()` to handle new filter dimensions

#### Files to Modify

| File | Change |
|---|---|
| `src/components/board/board-filters.tsx` | Add sprint, agent status, date range filters |
| `src/components/board/kanban-board.tsx` | Extend `filterStories()` with new filter logic |
| `src/types/index.ts` | Update `BoardFilterState` type if defined there |

#### Schema Changes

None.

#### API Changes

None -- all filtering is client-side on already-loaded story data.

#### Migration Strategy

None needed. Additive UI change only.

---

### Feature #16: Burndown Charts

#### Schema Changes

None. All required data exists:
- `Sprint.startDate`, `Sprint.endDate` -- sprint boundaries
- `Story.storyPoints` -- work units
- `Activity.type = "STORY_MOVED"` with `createdAt` timestamps -- when stories changed status
- `Story.sprintId` -- sprint assignment

#### API Route

```
GET /api/projects/[projectId]/sprints/[sprintId]/burndown
```

Response shape:

```typescript
interface BurndownDataPoint {
  date: string;           // ISO date (day granularity)
  idealRemaining: number; // linear burn from total to 0
  actualRemaining: number; // actual remaining story points
  scopeChange: number;    // net points added/removed that day
}

interface BurndownResponse {
  sprintName: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPoints: number;
  data: BurndownDataPoint[];
}
```

#### Implementation Logic

```
1. Load sprint with stories (storyPoints, status, sprintId)
2. Load Activity records where type = "STORY_MOVED" and storyId in sprint stories
3. For each day in [startDate, endDate]:
   a. Calculate stories completed (moved to DONE) by that day
   b. actualRemaining = totalPoints - sum(completed story points by that day)
   c. idealRemaining = totalPoints * (daysRemaining / totalDays)
4. Return array of data points
```

#### Frontend Component

```
src/components/sprints/burndown-chart.tsx
```

Uses recharts `AreaChart` with two lines:
- Dashed gray line: ideal burndown
- Solid blue line: actual burndown
- Optional: red area for scope changes

Integrate into existing analytics page (`src/app/(dashboard)/projects/[projectId]/analytics/page.tsx`) below the velocity chart, with a sprint selector dropdown.

#### Files to Create/Modify

| File | Action |
|---|---|
| `src/app/api/projects/[projectId]/sprints/[sprintId]/burndown/route.ts` | CREATE -- API endpoint |
| `src/components/sprints/burndown-chart.tsx` | CREATE -- recharts component |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY -- add burndown section with sprint selector |

#### Migration Strategy

None needed. Reads existing data.

---

### Feature #8: Cycle Time / Lead Time Analytics

#### Schema Changes

None. Activity records with type `STORY_MOVED` and `createdAt` timestamps provide the full state transition history.

#### API Route

```
GET /api/projects/[projectId]/analytics/cycle-time?from=DATE&to=DATE&type=feature
```

Response shape:

```typescript
interface CycleTimeResponse {
  period: { from: string; to: string };
  storyCount: number;
  leadTime: {               // Created -> DONE
    p50: number;            // hours
    p85: number;
    p95: number;
    average: number;
  };
  cycleTime: {              // First IN_PROGRESS -> DONE
    p50: number;
    p85: number;
    p95: number;
    average: number;
  };
  throughput: {             // stories completed per week
    weekly: Array<{ week: string; count: number }>;
    average: number;
  };
  byType: Record<string, { leadTimeP50: number; cycleTimeP50: number; count: number }>;
  byPriority: Record<string, { leadTimeP50: number; cycleTimeP50: number; count: number }>;
  trend: Array<{           // rolling 4-week averages
    week: string;
    leadTimeP50: number;
    cycleTimeP50: number;
  }>;
}
```

#### Implementation Logic

```
1. Query completed stories (status = DONE) in date range
2. For each story:
   a. leadTime = story.updatedAt (when moved to DONE) - story.createdAt
   b. Find first Activity where type = "STORY_MOVED" and message contains "IN_PROGRESS"
   c. cycleTime = story.updatedAt - firstInProgressActivity.createdAt
3. Compute percentiles using sorted arrays
4. Group by type and priority for breakdown
5. Compute weekly throughput from Activity records
```

#### Frontend Components

```
src/components/analytics/cycle-time-chart.tsx    -- main chart (recharts LineChart)
src/components/analytics/throughput-chart.tsx     -- weekly throughput bar chart
src/components/analytics/metric-card.tsx          -- p50/p85/p95 display card
```

#### Files to Create/Modify

| File | Action |
|---|---|
| `src/app/api/projects/[projectId]/analytics/cycle-time/route.ts` | CREATE |
| `src/components/analytics/cycle-time-chart.tsx` | CREATE |
| `src/components/analytics/throughput-chart.tsx` | CREATE |
| `src/components/analytics/metric-card.tsx` | CREATE |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY -- add cycle time section |

#### Migration Strategy

None. Reads existing Activity records. Projects with limited history will show sparse data -- add an empty state message.

#### Key Decision: Activity Parsing vs Dedicated Timestamps

Two approaches:
- **A) Parse Activity records** (recommended): No schema change, works retroactively for all existing stories.
- **B) Add `firstInProgressAt`, `completedAt` columns to Story**: Faster queries but requires migration and backfill.

Recommendation: Start with (A). If query performance becomes a problem with 10k+ stories, add denormalized timestamps (B) as an optimization.

---

### Feature #6: Agent Performance Dashboard

#### Schema Changes

None. All data exists:
- `Story.assignedToAgent` -- boolean
- `Story.agentStatus` -- RUNNING, COMPLETED, FAILED, null
- `Story.agentTriggeredAt` -- when agent started
- `Story.reviewedAt` -- when human reviewed
- `Activity.type` -- AGENT_TRIGGERED, STORY_MOVED (with "Review feedback:" for rejections)

#### API Route

```
GET /api/projects/[projectId]/analytics/agent-performance?from=DATE&to=DATE
```

Response shape:

```typescript
interface AgentPerformanceResponse {
  period: { from: string; to: string };
  summary: {
    totalTriggered: number;
    completedCount: number;         // agentStatus = COMPLETED
    failedCount: number;            // agentStatus = FAILED
    completionRate: number;         // percentage
    averageDuration: number;        // minutes (triggeredAt -> completedAt)
    firstPassApprovalRate: number;  // approved without rejection
    rejectionCount: number;
  };
  trend: Array<{
    week: string;
    triggered: number;
    completed: number;
    failed: number;
    avgDurationMinutes: number;
  }>;
  topRejectionReasons: Array<{
    pattern: string;
    count: number;
  }>;
  byStoryType: Record<string, {
    count: number;
    completionRate: number;
    avgDurationMinutes: number;
  }>;
}
```

#### Implementation Logic

```
1. Query stories where assignedToAgent = true, within date range
2. Compute completion rate: COMPLETED / (COMPLETED + FAILED)
3. Duration: diff between agentTriggeredAt and the STORY_MOVED to REVIEW activity
4. First-pass approval: stories that went REVIEW -> DONE without a rejection feedback activity
5. Rejection reasons: parse Activity messages containing "Review feedback:"
6. Group by week for trend, by story type for breakdown
```

#### Frontend Components

```
src/components/analytics/agent-performance.tsx     -- main dashboard section
src/components/analytics/agent-trend-chart.tsx      -- weekly trend (recharts)
src/components/analytics/rejection-patterns.tsx     -- top rejection reasons list
```

#### Files to Create/Modify

| File | Action |
|---|---|
| `src/app/api/projects/[projectId]/analytics/agent-performance/route.ts` | CREATE |
| `src/components/analytics/agent-performance.tsx` | CREATE |
| `src/components/analytics/agent-trend-chart.tsx` | CREATE |
| `src/components/analytics/rejection-patterns.tsx` | CREATE |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY -- add agent tab |

#### Key Decision: Analytics Page Structure

The current analytics page is a single server component. With burndown, cycle time, AND agent performance, it needs restructuring:

```
/analytics              -- overview with summary cards
/analytics?tab=velocity -- existing velocity chart
/analytics?tab=burndown -- burndown chart (new)
/analytics?tab=cycle    -- cycle time metrics (new)
/analytics?tab=agents   -- agent performance (new)
```

Use client-side tabs (shadcn `Tabs` component) with each tab loading data via SWR. This avoids loading all analytics data upfront.

#### Migration Strategy

None. Reads existing data. Agent performance data only exists for projects that have used the agent system.

---

### Feature #2: Usage-Based AI Add-On Packs

#### Schema Changes

```prisma
model AiCreditPack {
  id             String       @id @default(cuid())
  orgId          String
  credits        Int          // number of AI rewrites purchased
  creditsUsed    Int          @default(0)
  priceId        String       // Paddle price ID for this pack
  transactionId  String       @unique  // Paddle transaction ID
  purchasedAt    DateTime     @default(now())
  expiresAt      DateTime?    // optional expiry (e.g., end of billing period)
  org            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([orgId, expiresAt])
}
```

Also add to Organization model:

```prisma
model Organization {
  // ... existing fields
  creditPacks    AiCreditPack[]
}
```

#### API Routes

| Route | Method | Purpose |
|---|---|---|
| `POST /api/orgs/[orgId]/credit-packs/purchase` | POST | Initiate Paddle checkout for credit pack |
| `GET /api/orgs/[orgId]/credit-packs` | GET | List active credit packs and remaining balance |
| `POST /api/webhooks/paddle` (extend) | POST | Handle `transaction.completed` for credit packs |

#### Modify `checkRewriteLimit()` in `plan-limits.ts`

```typescript
// After checking plan limit, also check credit packs:
if (used >= limit) {
  // Check if org has active credit packs with remaining credits
  const availableCredits = await prisma.aiCreditPack.aggregate({
    where: {
      orgId: project.orgId,
      expiresAt: { gt: new Date() }, // or null
      creditsUsed: { lt: prisma.aiCreditPack.fields.credits }, // has remaining
    },
    _sum: { credits: true, creditsUsed: true },
  });

  const packRemaining = (availableCredits._sum.credits ?? 0) - (availableCredits._sum.creditsUsed ?? 0);
  if (packRemaining > 0) {
    return { allowed: true, used, limit, remaining: packRemaining, source: "credit_pack" };
  }
}
```

When a rewrite is consumed from a credit pack, increment `creditsUsed` on the oldest non-exhausted pack (FIFO).

#### Frontend Changes

| File | Change |
|---|---|
| `src/app/(dashboard)/settings/billing/page.tsx` (or equivalent) | Add credit pack purchase section |
| `src/components/billing/credit-pack-card.tsx` | CREATE -- shows available packs, remaining credits |
| `src/components/billing/purchase-credits-button.tsx` | CREATE -- triggers Paddle checkout |

#### Paddle Configuration

- Create a one-time purchase product in Paddle for credit packs (e.g., "10 AI Credits", "50 AI Credits")
- Handle `transaction.completed` webhook event to create `AiCreditPack` record

#### Key Decisions

1. **Pack sizes**: 10 credits ($5), 50 credits ($20), 200 credits ($60) -- decreasing per-unit cost
2. **Expiry**: Credit packs expire at end of current billing period (if subscribed) or after 90 days (if free)
3. **FIFO consumption**: Use oldest pack first to avoid expiry waste
4. **No rollover**: Credits do not roll over to next billing period for subscribed users

#### Migration Strategy

1. `prisma db push` to add `AiCreditPack` model
2. No data migration needed -- no existing credit packs

---

## Dependency Graph

```
#13 Board Filters -----> (none, standalone)
#16 Burndown Charts ---> (none, standalone)
#8  Cycle Time --------> (none, standalone)
#6  Agent Dashboard ---> (none, standalone)
#2  AI Credit Packs ---> (none, standalone)

#7  Keyboard Shortcuts -> (none)
#15 Inline Editing -----> (none)
#14 Story Templates ----> (none)

#1  Seat-Based Pricing -> Paddle reconfiguration
#3  Slack/Discord ------> OAuth app registration
#4  Jira/Linear Import -> (none, but benefits from #14 Templates)
#5  Real-Time SSE ------> Redis pub/sub, Vercel Pro plan
#9  Agent Auto-Tests ---> Agent system maturity
#10 Epics/Milestones ---> (none, but benefits from #8 Cycle Time at epic level)
#11 Custom Fields ------> (none, but large surface area)
#12 GitLab/Bitbucket ---> Git provider abstraction layer
```

All top 5 features are independent of each other and can be built in parallel by separate developers.

---

## Risk Register

| Risk | Severity | Mitigation | Affected Features |
|---|---|---|---|
| Activity table query performance at scale (10k+ records) | MEDIUM | Add date range filters, consider materialized views later | #8, #6, #16 |
| Paddle one-time purchase flow complexity | LOW | Well-documented Paddle API, sandbox testing | #2 |
| Analytics page becomes too heavy (multiple data sources) | MEDIUM | Use client-side tabs with lazy SWR loading per tab | #6, #8, #16 |
| Vercel serverless SSE timeout (30s hobby, 5min pro) | HIGH | Defer #5, keep polling. If SSE needed, use Ably/Pusher | #5 |
| Agent auto-test quality | HIGH | Defer #9 entirely until agent completion rate exceeds 80% | #9 |
| Custom fields EAV performance | MEDIUM | Defer #11, add specific fields as needed | #11 |
| Git provider abstraction scope | HIGH | Defer #12, document abstraction boundaries for future | #12 |
| Board filter state URL sync | LOW | Use URL search params for shareable filter states | #13 |

---

## Architecture Conventions for Implementation

All new features MUST follow these existing patterns:

1. **API auth**: Use `requireProjectAccess()` from `src/lib/api-auth.ts`
2. **Request parsing**: Use `parseJsonBody()` for POST/PATCH bodies
3. **Error responses**: Use `sanitizeError()` / return `NextResponse.json({ error }, { status })`
4. **Validation**: Zod schemas in `src/lib/validations/` for all inputs
5. **Activity logging**: Create Activity records for all significant state changes
6. **Plan gating**: Check plan limits where applicable via `plan-limits.ts`
7. **File size**: Keep all files under 500 lines
8. **Testing**: Write tests for all new API routes and utility functions
9. **Types**: Export typed interfaces for all API responses in `src/types/`
