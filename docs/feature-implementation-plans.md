# Feature Implementation Plans

**Author:** Next.js Coder
**Date:** 2026-03-26
**Based on:** [Feature Architecture Assessment](./feature-architecture.md)
**Status:** Ready for development

---

## Table of Contents

1. [Feature #13: Board Search and Filters (Polish)](#feature-13-board-search-and-filters-polish)
2. [Feature #16: Burndown Charts](#feature-16-burndown-charts)
3. [Feature #8: Cycle Time / Lead Time Analytics](#feature-8-cycle-time--lead-time-analytics)
4. [Feature #6: Agent Performance Dashboard](#feature-6-agent-performance-dashboard)
5. [Feature #2: Usage-Based AI Add-On Packs](#feature-2-usage-based-ai-add-on-packs)

---

## Feature #13: Board Search and Filters (Polish)

**Estimated total effort:** 1-2 days

### Current State

- `BoardFilters` component exists at `src/components/board/board-filters.tsx` with search, priority, type, label, and assignee filters
- `SavedFilters` component exists at `src/components/board/saved-filters.tsx` with SWR-based persistence
- `filterStories()` callback in `kanban-board.tsx` (lines 399-427) handles client-side filtering
- `BoardFilterState` interface exported from `board-filters.tsx` (line 14-20)
- `EMPTY_FILTERS` constant exported for reset (line 22-28)
- `normalizeFilter()` in `saved-filters.tsx` (line 299-307) must stay in sync with `BoardFilterState`

### Schema Changes

None.

### API Routes

None -- all filtering is client-side on already-loaded story data.

### Task Breakdown

#### Task 1: Extend `BoardFilterState` interface (0.5h)

**File:** `src/components/board/board-filters.tsx`

Add new fields to the existing `BoardFilterState` interface:

```typescript
export interface BoardFilterState {
  search: string;
  priorities: string[];
  types: string[];
  labelIds: string[];
  assigneeIds: string[];
  // NEW fields:
  sprintId: string | null;
  agentStatuses: string[];
  dateRange: { from: string | null; to: string | null } | null;
  hasAgent: boolean | null;
}
```

Update `EMPTY_FILTERS` to include defaults:

```typescript
const EMPTY_FILTERS: BoardFilterState = {
  search: "",
  priorities: [],
  types: [],
  labelIds: [],
  assigneeIds: [],
  sprintId: null,
  agentStatuses: [],
  dateRange: null,
  hasAgent: null,
};
```

Update `hasActiveFilters` check in `BoardFilters` component (line 38-43) to include new fields.

#### Task 2: Add sprint filter dropdown to `BoardFilters` (1h)

**File:** `src/components/board/board-filters.tsx`

- Add `sprints` to `BoardFiltersProps` interface: `sprints?: Array<{ id: string; name: string }>`
- Add a `Select` dropdown (shadcn) for sprint selection, following the same pattern as the priority/type dropdowns
- When a sprint is selected, set `filters.sprintId`; "All Sprints" option clears to null

#### Task 3: Add agent status filter chips (0.5h)

**File:** `src/components/board/board-filters.tsx`

- Add a `DropdownMenuCheckboxItem` group for agent statuses: `RUNNING`, `COMPLETED`, `FAILED`, `Manual` (null)
- Follow the existing pattern used by the priority filter (lines 61-86)
- Add `hasAgent` toggle: a separate button or checkbox "Agent stories only" / "Manual only"

#### Task 4: Add date range filter (1h)

**File:** `src/components/board/board-filters.tsx`

- Add two `Input` elements (type="date") for from/to date range
- Wrap in a `Popover` (shadcn) triggered by a "Date Range" button with `Filter` icon
- When either date is set, update `filters.dateRange`

#### Task 5: Extend `filterStories()` in kanban-board (1h)

**File:** `src/components/board/kanban-board.tsx`

Extend the `filterStories` callback (lines 399-427) to handle new filter dimensions:

```typescript
// After existing checks (search, priorities, types, labelIds, assigneeIds):

if (filters.sprintId && s.sprintId !== filters.sprintId) return false;

if (filters.agentStatuses.length > 0) {
  const storyAgentStatus = s.agentStatus || "MANUAL";
  if (!filters.agentStatuses.includes(storyAgentStatus)) return false;
}

if (filters.hasAgent === true && !s.assignedToAgent) return false;
if (filters.hasAgent === false && s.assignedToAgent) return false;

if (filters.dateRange) {
  const created = new Date(s.createdAt);
  if (filters.dateRange.from && created < new Date(filters.dateRange.from)) return false;
  if (filters.dateRange.to && created > new Date(filters.dateRange.to + "T23:59:59")) return false;
}
```

Also pass `sprints` from the board page to `BoardFilters` component. The board page already loads sprint data.

#### Task 6: Update `SavedFilters` normalization (0.5h)

**File:** `src/components/board/saved-filters.tsx`

Update `normalizeFilter()` (line 299-307) to handle new fields:

```typescript
function normalizeFilter(f: Partial<BoardFilterState>): BoardFilterState {
  return {
    search: f.search ?? "",
    priorities: f.priorities ?? [],
    types: f.types ?? [],
    labelIds: f.labelIds ?? [],
    assigneeIds: f.assigneeIds ?? [],
    sprintId: f.sprintId ?? null,
    agentStatuses: f.agentStatuses ?? [],
    dateRange: f.dateRange ?? null,
    hasAgent: f.hasAgent ?? null,
  };
}
```

Update `filtersMatch()` (line 44-52) to compare new fields.

Update the `handleSave` body serialization (lines 106-114) to include new filter fields.

#### Task 7: Write tests (1h)

**File:** `tests/components/board-filters.test.ts` (or extend existing)

- Test that new filter fields default correctly
- Test `filterStories()` logic for sprint, agent status, date range, hasAgent
- Test that `normalizeFilter()` handles partial saved filter data with new fields

### Files to Create/Modify

| File | Action | Effort |
|---|---|---|
| `src/components/board/board-filters.tsx` | MODIFY -- extend interface, add 3 new filter UI elements | 2h |
| `src/components/board/kanban-board.tsx` | MODIFY -- extend `filterStories()`, pass sprints prop | 1h |
| `src/components/board/saved-filters.tsx` | MODIFY -- update `normalizeFilter()`, `filtersMatch()` | 0.5h |
| `tests/components/board-filters.test.ts` | CREATE or MODIFY -- test new filter logic | 1h |

### Libraries

None -- all UI components (Select, DropdownMenu, Popover, Input) already exist in shadcn.

### CLAUDE.md Compliance

- No schema changes, no API changes -- purely frontend
- Files remain under 500 lines (`board-filters.tsx` is 194 lines, will grow to ~280)
- Uses existing shadcn components (Select, DropdownMenu, Popover)
- No new dependencies
- Client-side filtering only, matching existing pattern

---

## Feature #16: Burndown Charts

**Estimated total effort:** 3-4 days

### Current State

- Sprint model has `startDate`, `endDate` (schema line 257-270)
- Story has `storyPoints`, `status`, `sprintId` (schema lines 187-241)
- Activity records with `type = "STORY_MOVED"` and `createdAt` timestamps track all status transitions
- `VelocityChart` at `src/components/sprints/velocity-chart.tsx` provides a recharts pattern to follow
- Analytics page at `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` is a server component (87 lines)

### Schema Changes

None.

### API Routes

**New:** `GET /api/projects/[projectId]/sprints/[sprintId]/burndown`

### Task Breakdown

#### Task 1: Create burndown API route (3h)

**File:** `src/app/api/projects/[projectId]/sprints/[sprintId]/burndown/route.ts`

```typescript
// Response types
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

Implementation logic:

1. Use `requireProjectAccess()` from `src/lib/api-auth.ts` for auth
2. Load sprint with stories: `prisma.sprint.findUnique({ where: { id: sprintId, projectId }, include: { stories: { select: { id, storyPoints, status } } } })`
3. Load Activity records: `prisma.activity.findMany({ where: { type: "STORY_MOVED", storyId: { in: storyIds }, message: { contains: "DONE" }, createdAt: { gte: sprint.startDate, lte: sprint.endDate || new Date() } } })`
4. For each day in `[startDate, min(endDate, today)]`:
   - Calculate cumulative completed story points by that day
   - `actualRemaining = totalPoints - completedPointsByDay`
   - `idealRemaining = totalPoints * (daysRemaining / totalDays)`
5. Return 404 if sprint not found, 400 if sprint has no startDate

#### Task 2: Add Zod validation schema (0.5h)

**File:** `src/lib/validations/burndown.ts`

Validate query params (none required for this endpoint, but validate sprintId format).

#### Task 3: Create burndown chart component (3h)

**File:** `src/components/sprints/burndown-chart.tsx`

Follow the `VelocityChart` pattern:

- Use recharts `AreaChart` with `ResponsiveContainer`
- Two lines: dashed gray `idealRemaining` (reference line), solid blue `actualRemaining`
- Optional: subtle red shading for scope changes
- Wrap in shadcn `Card` / `CardHeader` / `CardContent`
- Accept `data: BurndownDataPoint[]` as props
- Empty state: "No burndown data available. Start a sprint with dates and story points."
- Use `useSWR` for data fetching with sprint selector

```typescript
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSWR from "swr";
```

#### Task 4: Add burndown section to analytics page (2h)

**File:** `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx`

The analytics page is currently a server component (87 lines). To support the burndown chart with a client-side sprint selector, one of two approaches:

**Approach A (recommended):** Keep analytics page as server component, add a client wrapper for the burndown section.

- Create `src/components/sprints/burndown-section.tsx` -- a `"use client"` component that:
  - Accepts `sprints: Array<{ id: string; name: string; status: string }>` from the server component
  - Renders a sprint selector dropdown
  - Uses SWR to fetch `/api/projects/{projectId}/sprints/{sprintId}/burndown`
  - Renders `BurndownChart` with the fetched data
- In the analytics page, query sprints (already queried at line 24-32) and pass to `BurndownSection`

**Approach B:** Convert analytics to client component with tabs (deferred to Feature #6/#8 when we restructure analytics).

#### Task 5: Write tests (2h)

**Files:**
- `tests/api/burndown.test.ts` -- API route tests
- `tests/components/burndown-chart.test.ts` -- component rendering tests

API tests:
- Returns 404 for non-existent sprint
- Returns correct burndown data for a sprint with completed stories
- Handles sprints with no start date (400)
- Handles sprints with no stories (empty data array with zero points)
- Auth: requires project membership

### Files to Create/Modify

| File | Action | Effort |
|---|---|---|
| `src/app/api/projects/[projectId]/sprints/[sprintId]/burndown/route.ts` | CREATE | 3h |
| `src/lib/validations/burndown.ts` | CREATE | 0.5h |
| `src/components/sprints/burndown-chart.tsx` | CREATE | 2h |
| `src/components/sprints/burndown-section.tsx` | CREATE | 1h |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY -- add burndown section below velocity chart | 0.5h |
| `tests/api/burndown.test.ts` | CREATE | 1.5h |
| `tests/components/burndown-chart.test.ts` | CREATE | 0.5h |

### Libraries

None -- `recharts` is already installed and used by `VelocityChart`.

### CLAUDE.md Compliance

- API route uses `requireProjectAccess()` for auth
- Zod validation for inputs
- Activity records queried with existing `[projectId, createdAt]` index
- No schema changes, reads existing data
- All files under 500 lines
- recharts pattern matches existing `VelocityChart`
- Error responses use `NextResponse.json({ error }, { status })` pattern

---

## Feature #8: Cycle Time / Lead Time Analytics

**Estimated total effort:** 1-1.5 weeks

### Current State

- Activity records with `type = "STORY_MOVED"` capture all status transitions with timestamps (schema line 293-311)
- Activity has indexes on `[projectId, createdAt]` and `[storyId]`
- Analytics page exists but is simple (87 lines, server component)
- recharts is installed
- Story has `createdAt`, `updatedAt`, `status` fields

### Schema Changes

None. Activity records already contain all required data.

### API Routes

**New:** `GET /api/projects/[projectId]/analytics/cycle-time`

Query params: `from` (ISO date), `to` (ISO date), `type` (story type filter, optional)

### Task Breakdown

#### Task 1: Create cycle time API route (4h)

**File:** `src/app/api/projects/[projectId]/analytics/cycle-time/route.ts`

Response shape:

```typescript
interface CycleTimeResponse {
  period: { from: string; to: string };
  storyCount: number;
  leadTime: { p50: number; p85: number; p95: number; average: number }; // hours
  cycleTime: { p50: number; p85: number; p95: number; average: number }; // hours
  throughput: {
    weekly: Array<{ week: string; count: number }>;
    average: number;
  };
  byType: Record<string, { leadTimeP50: number; cycleTimeP50: number; count: number }>;
  byPriority: Record<string, { leadTimeP50: number; cycleTimeP50: number; count: number }>;
  trend: Array<{ week: string; leadTimeP50: number; cycleTimeP50: number }>;
}
```

Implementation:

1. Auth via `requireProjectAccess()`
2. Validate query params with Zod (`from`, `to` as ISO dates, `type` as optional story type)
3. Query completed stories: `prisma.story.findMany({ where: { projectId, status: "DONE", updatedAt: { gte: from, lte: to }, ...(type ? { type } : {}) } })`
4. For each story, query its Activity records: `prisma.activity.findMany({ where: { storyId: { in: storyIds }, type: "STORY_MOVED" }, orderBy: { createdAt: "asc" } })`
5. Compute per-story:
   - `leadTime = doneActivity.createdAt - story.createdAt` (hours)
   - `cycleTime = doneActivity.createdAt - firstInProgressActivity.createdAt` (hours)
   - First IN_PROGRESS: find Activity where message contains "IN_PROGRESS"
   - DONE: find Activity where message contains "DONE"
6. Compute percentiles using a `percentile(sortedArray, p)` utility
7. Group by type and priority for breakdowns
8. Compute weekly throughput and rolling 4-week trend averages
9. Return 400 if `from`/`to` missing; return empty data for projects with no completed stories

#### Task 2: Create percentile utility (0.5h)

**File:** `src/lib/stats.ts`

```typescript
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

#### Task 3: Create Zod validation schema (0.5h)

**File:** `src/lib/validations/analytics.ts`

```typescript
import { z } from "zod";

export const cycleTimeQuerySchema = z.object({
  from: z.string().datetime().optional().default(() => new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
  to: z.string().datetime().optional().default(() => new Date().toISOString()),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).optional(),
});
```

#### Task 4: Create metric card component (1h)

**File:** `src/components/analytics/metric-card.tsx`

A reusable card showing a metric with label and subtitle. Used for p50/p85/p95 displays.

```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
}
```

Follow shadcn `Card` pattern. Will be reused by Feature #6 as well.

#### Task 5: Create cycle time chart component (3h)

**File:** `src/components/analytics/cycle-time-chart.tsx`

- recharts `LineChart` showing lead time and cycle time trends over weeks
- Two lines: lead time (p50) and cycle time (p50) with tooltips
- Uses `ResponsiveContainer` for responsiveness
- Wraps in shadcn `Card`

#### Task 6: Create throughput chart component (2h)

**File:** `src/components/analytics/throughput-chart.tsx`

- recharts `BarChart` showing stories completed per week
- Single bar series with average reference line
- Follow `VelocityChart` pattern

#### Task 7: Create cycle time analytics section (2h)

**File:** `src/components/analytics/cycle-time-section.tsx`

A `"use client"` wrapper component that:

- Accepts `projectId` prop
- Has date range selector (from/to inputs) and optional story type filter
- Uses SWR to fetch cycle time data
- Renders:
  - Row of `MetricCard` components for p50/p85/p95 lead time and cycle time
  - `CycleTimeChart` for trend visualization
  - `ThroughputChart` for weekly throughput
  - Breakdown tables by type and priority

#### Task 8: Integrate into analytics page (1h)

**File:** `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx`

- Import and render `CycleTimeSection` below the burndown section
- Pass `projectId` prop
- Add a heading "Flow Metrics" with description "Track lead time, cycle time, and throughput"

#### Task 9: Add response types to types file (0.5h)

**File:** `src/types/index.ts`

Export `CycleTimeResponse` interface for use by both API route and frontend.

#### Task 10: Write tests (3h)

**Files:**
- `tests/api/cycle-time.test.ts` -- API route tests
- `tests/lib/stats.test.ts` -- percentile/average utility tests
- `tests/components/cycle-time-chart.test.ts` -- component rendering tests

Key API test cases:
- Returns correct percentiles for known data sets
- Handles projects with no completed stories (empty response)
- Filters by story type correctly
- Date range filtering works
- Auth: requires project membership
- Returns 400 for invalid date formats

### Files to Create/Modify

| File | Action | Effort |
|---|---|---|
| `src/app/api/projects/[projectId]/analytics/cycle-time/route.ts` | CREATE | 4h |
| `src/lib/stats.ts` | CREATE | 0.5h |
| `src/lib/validations/analytics.ts` | CREATE | 0.5h |
| `src/components/analytics/metric-card.tsx` | CREATE | 1h |
| `src/components/analytics/cycle-time-chart.tsx` | CREATE | 3h |
| `src/components/analytics/throughput-chart.tsx` | CREATE | 2h |
| `src/components/analytics/cycle-time-section.tsx` | CREATE | 2h |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY | 1h |
| `src/types/index.ts` | MODIFY -- add response types | 0.5h |
| `tests/api/cycle-time.test.ts` | CREATE | 2h |
| `tests/lib/stats.test.ts` | CREATE | 0.5h |
| `tests/components/cycle-time-chart.test.ts` | CREATE | 0.5h |

### Libraries

None new. Uses `recharts`, `swr`, `zod`, shadcn components -- all already installed.

### CLAUDE.md Compliance

- API route uses `requireProjectAccess()` for auth
- Zod validation for query params in `src/lib/validations/analytics.ts`
- Error responses via `NextResponse.json({ error }, { status })`
- Queries use existing Activity `[projectId, createdAt]` index with date bounds
- All files under 500 lines
- Types exported in `src/types/index.ts`
- No schema changes -- reads existing Activity records

---

## Feature #6: Agent Performance Dashboard

**Estimated total effort:** 1-1.5 weeks

### Current State

- `Story.assignedToAgent` (boolean), `Story.agentStatus` (RUNNING/COMPLETED/FAILED/null), `Story.agentTriggeredAt` (DateTime) exist in schema
- `Story.reviewedAt`, `Story.reviewedBy` track human review
- Activity records with `type = "AGENT_TRIGGERED"` and `type = "STORY_MOVED"` track agent lifecycle
- Rejection feedback stored in Activity messages containing "Review feedback:"
- `agent-trigger.ts` (line 1-123) and `agent-executor.ts` (line 1-367) are the agent system files
- Analytics page (87 lines) is ready for extension

### Schema Changes

None. All data exists in Story fields and Activity records.

### API Routes

**New:** `GET /api/projects/[projectId]/analytics/agent-performance`

Query params: `from` (ISO date), `to` (ISO date)

### Task Breakdown

#### Task 1: Create agent performance API route (4h)

**File:** `src/app/api/projects/[projectId]/analytics/agent-performance/route.ts`

Response shape:

```typescript
interface AgentPerformanceResponse {
  period: { from: string; to: string };
  summary: {
    totalTriggered: number;
    completedCount: number;
    failedCount: number;
    completionRate: number;       // percentage 0-100
    averageDuration: number;      // minutes
    firstPassApprovalRate: number; // percentage 0-100
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

Implementation:

1. Auth via `requireProjectAccess()`
2. Validate query params with Zod (reuse `src/lib/validations/analytics.ts` from Feature #8)
3. Query agent stories: `prisma.story.findMany({ where: { projectId, assignedToAgent: true, agentTriggeredAt: { gte: from, lte: to } } })`
4. Compute summary:
   - `completionRate = completedCount / (completedCount + failedCount) * 100`
   - `averageDuration`: for COMPLETED stories, diff between `agentTriggeredAt` and the STORY_MOVED to REVIEW activity
   - `firstPassApprovalRate`: stories that went REVIEW -> DONE without any Activity containing "Review feedback:" in between
5. Query rejection activities: `prisma.activity.findMany({ where: { projectId, type: "STORY_MOVED", message: { contains: "Review feedback:" } } })`
   - Parse feedback text, group similar patterns, count occurrences
6. Group by week for trend data
7. Group by story type for breakdown

#### Task 2: Extend Zod validation for agent analytics (0.5h)

**File:** `src/lib/validations/analytics.ts`

Add `agentPerformanceQuerySchema` alongside the cycle time schema (if not already done as part of Feature #8):

```typescript
export const agentPerformanceQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
```

#### Task 3: Create agent performance summary component (2h)

**File:** `src/components/analytics/agent-performance.tsx`

Main dashboard section that renders:

- Summary stat cards using `MetricCard` (from Feature #8): total triggered, completion rate, avg duration, first-pass approval rate
- Uses SWR for data fetching
- Date range selector

#### Task 4: Create agent trend chart component (2h)

**File:** `src/components/analytics/agent-trend-chart.tsx`

- recharts `BarChart` showing weekly triggered/completed/failed counts
- Stacked bars: completed (green), failed (red)
- Optional line overlay for avg duration
- Follow `VelocityChart` pattern

#### Task 5: Create rejection patterns component (1.5h)

**File:** `src/components/analytics/rejection-patterns.tsx`

- Ordered list of top rejection reasons with count badges
- Simple table or list UI using shadcn components
- Empty state: "No rejection patterns found. Agent feedback will appear here after review rejections."

#### Task 6: Create agent performance section wrapper (1.5h)

**File:** `src/components/analytics/agent-performance-section.tsx`

A `"use client"` component that:

- Accepts `projectId` prop
- Has date range selector
- Uses SWR to fetch agent performance data
- Orchestrates rendering of summary cards, trend chart, rejection patterns, and type breakdown

#### Task 7: Restructure analytics page with tabs (2h)

**File:** `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx`

With burndown, cycle time, AND agent performance, the analytics page needs restructuring. Convert to use client-side tabs:

- Keep the page as a server component that fetches initial data (velocity, story counts)
- Create `src/components/analytics/analytics-tabs.tsx` as a `"use client"` wrapper using shadcn `Tabs`:
  - **Overview** tab: current content (story counts, priority breakdown)
  - **Velocity** tab: existing `VelocityChart`
  - **Burndown** tab: `BurndownSection` (from Feature #16)
  - **Flow Metrics** tab: `CycleTimeSection` (from Feature #8)
  - **Agent** tab: `AgentPerformanceSection` (this feature)
- Each tab uses SWR to load data lazily, avoiding upfront load of all analytics

#### Task 8: Add response types (0.5h)

**File:** `src/types/index.ts`

Export `AgentPerformanceResponse` interface.

#### Task 9: Write tests (3h)

**Files:**
- `tests/api/agent-performance.test.ts` -- API route tests
- `tests/components/agent-performance.test.ts` -- component tests

Key API test cases:
- Returns correct completion rate for known data
- Handles projects with no agent stories (empty response)
- Correctly identifies first-pass approvals vs rejections
- Date range filtering works
- Auth: requires project membership
- Rejection pattern parsing extracts feedback text correctly

### Files to Create/Modify

| File | Action | Effort |
|---|---|---|
| `src/app/api/projects/[projectId]/analytics/agent-performance/route.ts` | CREATE | 4h |
| `src/lib/validations/analytics.ts` | MODIFY (or CREATE if #8 not done yet) | 0.5h |
| `src/components/analytics/agent-performance.tsx` | CREATE | 2h |
| `src/components/analytics/agent-trend-chart.tsx` | CREATE | 2h |
| `src/components/analytics/rejection-patterns.tsx` | CREATE | 1.5h |
| `src/components/analytics/agent-performance-section.tsx` | CREATE | 1.5h |
| `src/components/analytics/analytics-tabs.tsx` | CREATE | 2h |
| `src/app/(dashboard)/projects/[projectId]/analytics/page.tsx` | MODIFY -- use analytics-tabs wrapper | 1h |
| `src/types/index.ts` | MODIFY -- add response types | 0.5h |
| `tests/api/agent-performance.test.ts` | CREATE | 2h |
| `tests/components/agent-performance.test.ts` | CREATE | 1h |

### Libraries

None new.

### CLAUDE.md Compliance

- API route uses `requireProjectAccess()` for auth
- Zod validation for query params
- Error responses via `NextResponse.json({ error }, { status })`
- Queries leverage existing indexes: `Story [projectId, status, agentStatus]`, `Activity [projectId, createdAt]`
- All files under 500 lines
- Types exported in `src/types/index.ts`
- No schema changes
- SWR for client-side data fetching (matching project convention)

### Dependency Note

This feature should be implemented **after** Features #16 and #8 because Task 7 (analytics tabs restructure) integrates all three analytics features. If built in parallel, the analytics page modifications need coordination.

Alternatively, if built first, create the tabs structure upfront with placeholder tabs for burndown and flow metrics.

---

## Feature #2: Usage-Based AI Add-On Packs

**Estimated total effort:** 3-5 days

### Current State

- `plan-limits.ts` handles tier gating with `checkRewriteLimit()` (lines 55-114)
- `checkRewriteLimit()` counts `STORY_REWRITTEN` Activity records per month per org
- Paddle integration exists in `src/lib/paddle.ts` with `PLAN_LIMITS`, webhook signature verification
- Billing webhook at `src/app/api/billing/webhook/route.ts` handles subscription events
- Checkout is client-side via Paddle.js (checkout route is a stub)
- Organization model tracks `plan` and `paddleCustomerId`

### Schema Changes

**Add `AiCreditPack` model to `prisma/schema.prisma`:**

```prisma
model AiCreditPack {
  id             String       @id @default(cuid())
  orgId          String
  credits        Int
  creditsUsed    Int          @default(0)
  priceId        String       // Paddle price ID for this pack size
  transactionId  String       @unique  // Paddle transaction ID
  purchasedAt    DateTime     @default(now())
  expiresAt      DateTime?    // null = no expiry; or end of billing period
  org            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([orgId, expiresAt])
}
```

**Add relation to Organization model:**

```prisma
model Organization {
  // ... existing fields
  creditPacks    AiCreditPack[]
}
```

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `GET /api/orgs/[orgId]/credit-packs` | GET | List active credit packs and remaining balance |
| `POST /api/orgs/[orgId]/credit-packs/purchase` | POST | Generate Paddle checkout URL for credit pack |
| Extend `POST /api/billing/webhook` | -- | Handle `transaction.completed` for credit pack purchases |

### Task Breakdown

#### Task 1: Add `AiCreditPack` model to Prisma schema (0.5h)

**File:** `prisma/schema.prisma`

Add the `AiCreditPack` model after the `Subscription` model (around line 97). Add `creditPacks AiCreditPack[]` to the `Organization` model (around line 109).

Run `npx prisma generate` and `npx prisma db push` after.

#### Task 2: Create credit packs list API route (2h)

**File:** `src/app/api/orgs/[orgId]/credit-packs/route.ts`

GET handler:

1. Auth via session, verify user is member of org
2. Query active credit packs: `prisma.aiCreditPack.findMany({ where: { orgId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { purchasedAt: "asc" } })`
3. Compute total remaining: `sum(credits - creditsUsed)` where pack is not exhausted
4. Return packs array and total remaining credits

Response:

```typescript
interface CreditPacksResponse {
  packs: Array<{
    id: string;
    credits: number;
    creditsUsed: number;
    remaining: number;
    purchasedAt: string;
    expiresAt: string | null;
  }>;
  totalRemaining: number;
  totalPurchased: number;
}
```

#### Task 3: Create credit pack purchase API route (2h)

**File:** `src/app/api/orgs/[orgId]/credit-packs/purchase/route.ts`

POST handler:

1. Auth via session, verify user is OWNER or ADMIN of org
2. Validate body with Zod: `{ packSize: "10" | "50" | "200" }`
3. Map packSize to Paddle price ID from env vars: `PADDLE_CREDIT_PACK_10_PRICE_ID`, `PADDLE_CREDIT_PACK_50_PRICE_ID`, `PADDLE_CREDIT_PACK_200_PRICE_ID`
4. Return the price ID and pack details for the client to open Paddle.js checkout overlay
5. Client-side code will use `Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customData: { orgId, type: "credit_pack", packSize } })`

Response: `{ priceId: string; credits: number; packSize: string }`

Note: The actual checkout happens client-side via Paddle.js (matching existing checkout pattern). This route just resolves the price ID and validates permissions.

#### Task 4: Create Zod validation schema (0.5h)

**File:** `src/lib/validations/credit-pack.ts`

```typescript
import { z } from "zod";

export const purchaseCreditPackSchema = z.object({
  packSize: z.enum(["10", "50", "200"]),
});
```

#### Task 5: Extend billing webhook for credit pack purchases (2h)

**File:** `src/app/api/billing/webhook/route.ts`

In the `transaction.completed` case (line 152-167), add credit pack handling:

```typescript
case "transaction.completed": {
  if (!resolvedOrgId) break;

  // Check if this is a credit pack purchase
  if (customData?.type === "credit_pack") {
    const packSize = parseInt(customData.packSize || "0", 10);
    const transactionId = data.id ? String(data.id) : "";

    if (packSize > 0 && transactionId) {
      // Determine expiry: end of current billing period or 90 days for free users
      const org = await prisma.organization.findUnique({
        where: { id: resolvedOrgId },
        select: { plan: true },
      });
      const subscription = await prisma.subscription.findUnique({
        where: { orgId: resolvedOrgId },
        select: { currentPeriodEnd: true },
      });

      const expiresAt = subscription?.currentPeriodEnd
        ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days for free users

      await prisma.aiCreditPack.create({
        data: {
          orgId: resolvedOrgId,
          credits: packSize,
          priceId: data.items?.[0]?.price?.id ?? "",
          transactionId,
          expiresAt,
        },
      });
    }
    break;
  }

  // Existing subscription transaction handling...
}
```

#### Task 6: Modify `checkRewriteLimit()` to include credit packs (2h)

**File:** `src/lib/plan-limits.ts`

After the existing plan limit check fails (line 103: `if (used >= limit)`), add credit pack fallback:

```typescript
if (used >= limit) {
  // Check if org has active credit packs with remaining credits
  if (project?.orgId) {
    const packs = await prisma.aiCreditPack.findMany({
      where: {
        orgId: project.orgId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { credits: true, creditsUsed: true },
    });

    const packRemaining = packs.reduce(
      (sum, p) => sum + Math.max(0, p.credits - p.creditsUsed),
      0
    );

    if (packRemaining > 0) {
      return { allowed: true, used, limit, remaining: packRemaining };
    }
  }

  // Original error response...
}
```

Also create a `consumeCreditPackRewrite()` function:

```typescript
export async function consumeCreditPackRewrite(orgId: string): Promise<boolean> {
  // Find oldest non-exhausted, non-expired pack (FIFO)
  const pack = await prisma.aiCreditPack.findFirst({
    where: {
      orgId,
      creditsUsed: { lt: prisma.raw("credits") }, // Prisma v6 workaround
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { purchasedAt: "asc" },
  });

  if (!pack) return false;

  await prisma.aiCreditPack.update({
    where: { id: pack.id },
    data: { creditsUsed: { increment: 1 } },
  });

  return true;
}
```

Note: The FIFO consumption query needs careful handling in Prisma v6. Use `$queryRaw` with `$1` placeholder if the `lt: prisma.raw("credits")` approach is not supported:

```typescript
const pack = await prisma.$queryRaw`
  SELECT id FROM "AiCreditPack"
  WHERE "orgId" = ${orgId}
    AND "creditsUsed" < "credits"
    AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
  ORDER BY "purchasedAt" ASC
  LIMIT 1
`;
```

#### Task 7: Integrate credit consumption in rewrite flow (1h)

**File:** The API route that calls `checkRewriteLimit()` -- likely `src/app/api/projects/[projectId]/stories/rewrite/route.ts`

After a successful rewrite, if the rewrite was sourced from a credit pack (i.e., plan limit was exhausted but credit packs had remaining), call `consumeCreditPackRewrite(orgId)`.

This requires `checkRewriteLimit()` to return a `source` field indicating whether the allowance came from plan or credit pack:

```typescript
// Modify RewriteLimitResult to include source
export type RewriteLimitResult =
  | { allowed: true; used: number; limit: number; remaining: number; source: "plan" | "credit_pack" }
  | { allowed: false; used: number; limit: number; remaining: 0; message: string };
```

#### Task 8: Create credit pack purchase UI component (2h)

**File:** `src/components/billing/credit-pack-card.tsx`

A card component showing:

- Pack options: 10 credits ($5), 50 credits ($20), 200 credits ($60)
- Current remaining credit balance
- Purchase button that opens Paddle.js checkout overlay
- Uses SWR to fetch `/api/orgs/{orgId}/credit-packs` for current balance

#### Task 9: Create usage meter component (1h)

**File:** `src/components/billing/usage-meter.tsx`

A compact meter showing:

- Plan rewrites used / limit this month
- Credit pack balance (if any)
- "Buy more" link

Can be embedded in the project settings page or rewrite dialog.

#### Task 10: Add credit pack section to billing settings (1h)

**File:** `src/app/(dashboard)/settings/billing/page.tsx` (or the org billing page)

- Import and render `CreditPackCard` below the subscription section
- Pass `orgId` from session

#### Task 11: Write tests (3h)

**Files:**
- `tests/api/credit-packs.test.ts` -- GET and purchase route tests
- `tests/lib/plan-limits-credits.test.ts` -- `checkRewriteLimit()` with credit packs
- `tests/api/billing-webhook-credits.test.ts` -- webhook handling for credit packs

Key test cases:
- `checkRewriteLimit()` allows rewrite when plan is exhausted but credit packs have remaining
- `checkRewriteLimit()` denies when both plan and credit packs are exhausted
- `consumeCreditPackRewrite()` decrements oldest pack first (FIFO)
- Expired credit packs are not counted
- Webhook creates credit pack record with correct expiry
- GET route returns correct remaining balance
- Purchase route validates permissions (OWNER/ADMIN only)

### Files to Create/Modify

| File | Action | Effort |
|---|---|---|
| `prisma/schema.prisma` | MODIFY -- add `AiCreditPack` model and Organization relation | 0.5h |
| `src/app/api/orgs/[orgId]/credit-packs/route.ts` | CREATE | 2h |
| `src/app/api/orgs/[orgId]/credit-packs/purchase/route.ts` | CREATE | 2h |
| `src/lib/validations/credit-pack.ts` | CREATE | 0.5h |
| `src/app/api/billing/webhook/route.ts` | MODIFY -- add credit pack handling in transaction.completed | 2h |
| `src/lib/plan-limits.ts` | MODIFY -- extend `checkRewriteLimit()`, add `consumeCreditPackRewrite()` | 2h |
| `src/app/api/projects/[projectId]/stories/rewrite/route.ts` | MODIFY -- call `consumeCreditPackRewrite()` after rewrite | 1h |
| `src/components/billing/credit-pack-card.tsx` | CREATE | 2h |
| `src/components/billing/usage-meter.tsx` | CREATE | 1h |
| `src/app/(dashboard)/settings/billing/page.tsx` | MODIFY -- add credit pack section | 1h |
| `tests/api/credit-packs.test.ts` | CREATE | 1.5h |
| `tests/lib/plan-limits-credits.test.ts` | CREATE | 1h |
| `tests/api/billing-webhook-credits.test.ts` | CREATE | 0.5h |

### Libraries

None new. Paddle.js is already loaded client-side for subscription checkout.

### CLAUDE.md Compliance

- Schema change requires `npx prisma generate` and `npx prisma db push`
- API routes use session auth and org membership verification (following `src/app/api/orgs/` pattern)
- Zod validation for inputs in `src/lib/validations/credit-pack.ts`
- Error responses via `NextResponse.json({ error }, { status })`
- Webhook uses existing `verifyWebhookSignature()` from `src/lib/paddle.ts`
- Credit consumption uses `$queryRaw` with `$1` placeholders (no raw SQL injection)
- Sensitive fields (Paddle transaction IDs) stored as-is (not secrets, just identifiers)
- All files under 500 lines
- `plan-limits.ts` currently 165 lines, will grow to ~220 lines with credit pack logic
- FIFO consumption prevents credit waste from expiry

### Paddle Configuration Required

Before implementation, these Paddle sandbox products must be created:

1. Product: "AI Credit Pack - 10 Credits" with price $5 (one-time)
2. Product: "AI Credit Pack - 50 Credits" with price $20 (one-time)
3. Product: "AI Credit Pack - 200 Credits" with price $60 (one-time)

Env vars to add:
- `PADDLE_CREDIT_PACK_10_PRICE_ID`
- `PADDLE_CREDIT_PACK_50_PRICE_ID`
- `PADDLE_CREDIT_PACK_200_PRICE_ID`

---

## Implementation Order and Dependencies

```
Week 1:
  #13 Board Filters (1-2 days) -----> independent, ship immediately
  #16 Burndown Charts (3-4 days) ---> independent, ship immediately

Week 2-3:
  #8  Cycle Time Analytics ---------> creates shared utilities (stats.ts, metric-card.tsx, analytics.ts validation)
  #6  Agent Performance Dashboard --> depends on #8 for metric-card.tsx and analytics tabs restructure

Week 3-4:
  #2  AI Credit Packs --------------> independent, can be built in parallel with analytics
```

### Shared Code Between Features

| Shared Item | Created By | Used By |
|---|---|---|
| `src/lib/stats.ts` (percentile, average) | #8 | #6, #16 |
| `src/components/analytics/metric-card.tsx` | #8 | #6 |
| `src/lib/validations/analytics.ts` | #8 | #6 |
| `src/components/analytics/analytics-tabs.tsx` | #6 | #8, #16 (retroactively) |

### Risk Mitigations

1. **Activity table query performance**: All analytics API routes include mandatory `from`/`to` date bounds. Default 90 days. This leverages the existing `[projectId, createdAt]` index.

2. **Analytics page restructuring**: The tabs wrapper (`analytics-tabs.tsx`) should be created early. If implementing features in parallel, agree on tab names and props upfront to avoid merge conflicts.

3. **Credit pack FIFO query**: The `creditsUsed < credits` comparison in Prisma v6 may need `$queryRaw`. Test in dev before relying on the ORM approach.

4. **Paddle sandbox testing**: Credit pack purchase flow requires Paddle sandbox products to be configured. This should be done by the team lead before Task 8 (purchase UI) begins.
