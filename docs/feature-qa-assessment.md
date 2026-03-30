# Feature QA Assessment

**Author:** QA Tester
**Date:** 2026-03-26
**Status:** Ready for Team Review

---

## Table of Contents

1. [Feature 1: Board Search and Filters](#feature-1-board-search-and-filters)
2. [Feature 2: Burndown Charts](#feature-2-burndown-charts)
3. [Feature 3: Cycle Time / Lead Time Analytics](#feature-3-cycle-time--lead-time-analytics)
4. [Feature 4: Agent Performance Dashboard](#feature-4-agent-performance-dashboard)
5. [Feature 5: Usage-Based AI Add-On Packs](#feature-5-usage-based-ai-add-on-packs)
6. [Cross-Feature Concerns](#cross-feature-concerns)
7. [Accessibility Baseline](#accessibility-baseline)
8. [Risk Summary Matrix](#risk-summary-matrix)

---

## Feature 1: Board Search and Filters

**Architect Estimate:** 1-2 days
**Current State:** `BoardFilters` component exists with search, priority, type, label, and assignee filters. `SavedFilters` with persistence exists. `filterStories()` in `kanban-board.tsx` (lines 399-427) handles client-side filtering. New filters needed: sprint, agent status, date range, `hasAgent` toggle.

### UX Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Filter bar overflow on small screens | MEDIUM | The filter bar already has 6 elements (search, priority, type, label, assignee, clear). Adding sprint, agent status, date range, and hasAgent toggle pushes this to 10 elements. On screens below 1280px the `flex-wrap` will cause the filter bar to stack into 2-3 rows, pushing board content below the fold. |
| Search debounce missing | LOW | The current search input (`board-filters.tsx` line 56) fires `onFiltersChange` on every keystroke. With 500+ stories this causes a re-render on each character typed. Not a correctness issue but a noticeable lag on lower-end devices. |
| Agent status filter confusion | MEDIUM | Users unfamiliar with the agent system will see "Running / Completed / Failed" filter options with no context. If no stories have agent activity, these filters return empty results with no explanation. |
| Date range picker accessibility | MEDIUM | Simple from/to date inputs lack clear labeling. Screen readers will not communicate that these fields work together as a range. |
| Saved filters schema mismatch | HIGH | Existing `SavedFilters` component (`saved-filters.tsx` lines 44-51) compares `BoardFilterState` field-by-field. The `filtersMatch()` function and `normalizeFilter()` only know about the current 5 fields. After adding `sprintId`, `agentStatuses`, `dateRange`, and `hasAgent`, saved filters created with old schema will be loaded without these fields. `normalizeFilter()` must provide defaults for all new fields, or old saved filters will break the match comparison. |
| Filter state not reflected in URL | LOW | Filters are component state only. Users cannot share a filtered board view via URL. The architecture doc notes this as a risk but does not resolve it. |

### Edge Cases

| Edge Case | Expected Behavior | Risk |
|-----------|-------------------|------|
| No stories match any filter combination | Show empty columns with a "No stories match filters" message, not just blank columns | Currently no empty-state message exists in filtered view |
| 500+ stories, all filters active simultaneously | Client-side `filterStories()` runs on every render. With 6+ filter dimensions and 500 stories, this is O(n * filters). Should remain under 16ms but needs measurement. | LOW -- linear scan is fast for 500 items |
| Sprint filter selected but sprint has 0 stories | Columns show empty. User may think the filter is broken. | Need "0 stories in sprint" indicator |
| Agent status filter on a project that has never used agents | All stories have `agentStatus: null`. Filtering by "Running" or "Completed" returns nothing. | Show explanatory empty state or hide agent filters when no agent stories exist |
| Date range with `from` after `to` | Should either swap the dates silently or show a validation error | Must handle this explicitly |
| Date range across DST boundary | `createdAt` is stored as UTC. Filtering by local dates may miss stories created in the gap/overlap hour | Use UTC comparison consistently |
| Saved filter with sprint that was later deleted | `sprintId` in saved filter references a nonexistent sprint. Filter should degrade gracefully (ignore the sprint filter, not crash). | Validate sprint existence at apply time |
| Clearing filters while saved-filter "Views" dropdown is open | Should reset both the filter bar and the active-filter indicator in the Views button | Test for state sync |

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| `SavedFilters` SWR fetch fails (API 500) | Saved filters dropdown shows empty, no crash. Toast error not currently shown for this failure. | SWR has built-in error handling but the component silently swallows it |
| New filter fields cause `filterStories()` to throw on undefined access | Board renders with no stories visible. User sees empty board with no error. | Defensive coding: every new filter check must guard against undefined |
| URL search params desync with component state (if URL sync is implemented) | Back/forward navigation shows stale filters | Use `useSearchParams` with `replace` to keep in sync |

### Test Scenarios

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| F1-01 | Search by story title returns matching stories across all columns | E2E | HIGH |
| F1-02 | Search by shortId (e.g., "SF-12") returns exact match | E2E | HIGH |
| F1-03 | Combine priority=HIGH + type=BUG and verify only matching stories appear | E2E | HIGH |
| F1-04 | Apply sprint filter and verify only stories in that sprint are shown | E2E | HIGH |
| F1-05 | Apply agent status filter "FAILED" and verify only agent-failed stories appear | E2E | MEDIUM |
| F1-06 | Set date range and verify stories outside range are hidden | E2E | MEDIUM |
| F1-07 | Save a filter with new fields (sprint + agent status), reload page, apply saved filter, verify results match | E2E | HIGH |
| F1-08 | Clear all filters and verify all stories reappear, column counts reset | E2E | HIGH |
| F1-09 | Apply filters, verify keyboard navigation (arrow keys) only traverses filtered stories | E2E | MEDIUM |
| F1-10 | Verify filter bar is navigable via Tab key and all dropdowns are operable via keyboard | Accessibility | MEDIUM |
| F1-11 | With 0 stories matching filters, verify empty state message appears in columns | E2E | MEDIUM |
| F1-12 | Verify `data-testid` attributes exist on all new filter controls for test automation | Unit | HIGH |

### UX Improvement Suggestions

1. **Debounce search input** by 200ms to avoid excessive re-renders on large boards.
2. **Collapse secondary filters** behind a "More filters" button to prevent toolbar overflow. Show search + priority + type by default; hide sprint, agent status, date range behind the toggle.
3. **Show active filter count** as a badge on the "More filters" button so users know hidden filters are active.
4. **Add "No results" empty state** to each column when filters produce zero matches: "No stories match your filters. Try adjusting or clearing filters."
5. **Conditionally show agent filters** only when the project has at least one agent-triggered story. Query `assignedToAgent: true` count and hide agent filters if zero.
6. **Sync filters to URL search params** so filtered board views can be shared via link.

---

## Feature 2: Burndown Charts

**Architect Estimate:** 3-4 days
**Current State:** Analytics page (`analytics/page.tsx`) is a server component that shows velocity chart and story/priority counts. Sprint model exists with `startDate`/`endDate`. Activity records log `STORY_MOVED` events.

### UX Risks

| Risk | Severity | Detail |
|------|----------|--------|
| No sprint selector on analytics page | HIGH | The current analytics page loads all completed sprints for velocity. Burndown requires selecting a specific sprint. There is no sprint selector UI today. Must add a dropdown that lists active + completed sprints. |
| Empty chart for sprints without story points | HIGH | If a sprint has stories but none have `storyPoints` assigned, both ideal and actual lines are at 0. The chart renders as a flat line at zero, which is confusing. Need a "No story points assigned" message. |
| Future-dated sprints show incomplete charts | MEDIUM | An active sprint with `endDate` in the future should show the chart up to today, not project to `endDate`. The ideal line should extend to `endDate` but actual should stop at current date. |
| Chart performance with many data points | LOW | A 4-week sprint has ~20 working day data points. This is trivial for recharts. Only a risk if sprint durations exceed months. |
| Server component vs client component mismatch | MEDIUM | Current analytics page is a server component. Burndown chart with sprint selector requires client-side interactivity (SWR fetch on sprint change). The architecture doc proposes client-side tabs, which means refactoring the entire analytics page from server to client (or hybrid). This refactor is a prerequisite for the burndown feature and should be sized into the estimate. |
| Timezone mismatch in daily aggregation | MEDIUM | Activity `createdAt` is UTC. If the burndown groups by "day," a story completed at 11pm EST (4am UTC next day) appears on the wrong day in the chart. Should allow the user's local timezone for day boundaries, or clearly label the chart as UTC. |

### Edge Cases

| Edge Case | Expected Behavior | Risk |
|-----------|-------------------|------|
| Sprint with 0 stories | Show "No stories in this sprint" message instead of empty chart | Must handle |
| Sprint with stories but 0 total story points | Show "Stories have no points assigned" message | Must handle |
| Story added mid-sprint | Ideal line should not change (it is based on total points at sprint start). Actual remaining increases when a story is added. Architecture doc acknowledges this via `scopeChange` field. | Verify scope change is rendered visually |
| Story removed mid-sprint | Opposite of above: actual remaining decreases without completing work | Same as above |
| Story moved to DONE, then moved back to IN_PROGRESS | `actualRemaining` should increase again. The burndown is non-monotonic. | Verify chart handles "burn up" correctly |
| Sprint with no `startDate` or `endDate` | Cannot compute ideal line. Show error or fallback. | Sprints may have null dates if created without them |
| Sprint spanning a weekend/holiday | Ideal line burns linearly across all calendar days. Some teams expect weekdays-only burndown. | Document that the chart uses calendar days, not working days |
| Two sprints overlapping in date range | Sprint selector should allow selecting either. Each chart is independent. | No conflict |
| Completed sprint from 6 months ago | Data should still be available. Activity records are not purged. | Verify no date-based query limits |

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Burndown API returns 500 | Chart area shows error state. User sees "Failed to load burndown data." | SWR error handling with retry |
| Burndown API returns empty `data` array | Chart renders empty. Should show "No data available" message. | Check `data.length === 0` before rendering chart |
| Activity records missing for some stories (e.g., stories moved via direct DB edit) | Cycle time calculations are incomplete. Burndown may show stories as never completed. | Document this limitation. Activity records are the source of truth. |
| Sprint has 200 stories, all with large storyPoints values | `totalPoints` could be in the thousands. Y-axis scaling should handle this. | recharts auto-scales Y-axis |
| Browser tab left open on burndown page for hours | SWR stale data. Active sprint burndown does not update in real time. | Set SWR `refreshInterval` for active sprints (e.g., 60s) |

### Test Scenarios

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| F2-01 | Select a completed sprint, verify burndown chart renders with ideal and actual lines | E2E | HIGH |
| F2-02 | Select an active sprint, verify actual line stops at today and ideal line extends to `endDate` | E2E | HIGH |
| F2-03 | Sprint with 0 stories shows appropriate empty state message | E2E | HIGH |
| F2-04 | Sprint where stories were added mid-sprint shows scope change in chart | E2E | MEDIUM |
| F2-05 | Sprint where a story was moved back from DONE to IN_PROGRESS shows actual line going up | E2E | MEDIUM |
| F2-06 | Burndown API returns 500, verify error message is displayed and chart does not crash | E2E | HIGH |
| F2-07 | Verify burndown chart is accessible: axis labels, data points have aria descriptions | Accessibility | MEDIUM |
| F2-08 | Verify sprint selector dropdown lists sprints in reverse chronological order | E2E | MEDIUM |
| F2-09 | Verify burndown data API endpoint requires `requireProjectAccess()` authentication | Integration | HIGH |
| F2-10 | Verify burndown API response matches `BurndownResponse` type schema | Unit | HIGH |

### UX Improvement Suggestions

1. **Default to current active sprint** in the sprint selector. If no active sprint, default to most recently completed sprint.
2. **Add hover tooltips** on chart data points showing exact date, ideal remaining, actual remaining, and scope change for that day.
3. **Color-code the actual line** based on health: green when actual is below ideal (ahead of schedule), red when above (behind schedule).
4. **Add a "sprint health" summary** above the chart: "3 of 8 stories done (37.5%), 5 days remaining, on track / behind schedule."
5. **Show a loading skeleton** while the burndown API is fetching, not a blank area.
6. **Consider a burndown/burnup toggle** -- some teams prefer burnup charts (cumulative completed work) over burndown (remaining work).

---

## Feature 3: Cycle Time / Lead Time Analytics

**Architect Estimate:** 1-1.5 weeks
**Current State:** Activity records log `STORY_MOVED` events with timestamps. Analytics page shows velocity and story counts. No cycle time or lead time metrics exist.

### UX Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Percentile metrics confusing for non-technical users | MEDIUM | p50, p85, p95 are standard DORA metrics but many users will not understand them. Need tooltips or a legend explaining "p50 means 50% of stories were completed within this time." |
| Date range picker required but not standardized | MEDIUM | Both this feature and board filters need date range pickers. Should use a shared component to avoid inconsistency. |
| Large date range causes slow API response | HIGH | Querying Activity records for a 1-year range on a project with 10k+ activities could take 2-5 seconds. The architecture doc acknowledges this. Must show a loading indicator and consider query timeout handling. |
| Empty state for new projects | HIGH | A new project with 0 completed stories has no cycle time data. All percentiles are undefined. Must show "Complete some stories to see cycle time metrics" rather than NaN or empty charts. |
| "Lead time" vs "cycle time" definitions unclear | MEDIUM | Users may not know the difference. Lead time = created to DONE. Cycle time = first IN_PROGRESS to DONE. Need clear labels and tooltips. |
| Analytics page restructuring dependency | HIGH | The architecture doc proposes tabs for the analytics page. This restructuring is a prerequisite shared across burndown, cycle time, and agent dashboard. If not done first, these features will conflict on the same page. This should be sized as a separate task (0.5-1 day). |
| Stories that never reached IN_PROGRESS | MEDIUM | Stories moved directly from BACKLOG to DONE (e.g., via drag-and-drop) have no cycle time. They have lead time but cycle time is `null`. The API must handle this: either exclude these stories from cycle time calculations or show them separately. |
| Throughput chart week boundaries | LOW | Weekly throughput grouping depends on week start day (Sunday vs Monday). Should use ISO weeks (Monday start) for consistency but this may not match user expectations in all locales. |

### Edge Cases

| Edge Case | Expected Behavior | Risk |
|-----------|-------------------|------|
| Only 1 completed story in range | Percentiles are all the same value (that story's time). Throughput shows 1 bar. | Valid but misleading -- add "Low sample size" warning when count < 5 |
| Story moved to DONE, then back, then to DONE again | Lead time uses `createdAt` to final DONE. Cycle time uses first IN_PROGRESS to final DONE. The "final DONE" is the last STORY_MOVED activity to DONE status. | Must use the LAST move to DONE, not the first |
| Story with 0 cycle time (moved to IN_PROGRESS and DONE in same minute) | Valid edge case for trivial fixes. Should not be excluded but may skew p50. | Include in calculations, document as expected |
| Date range `from` = `to` (single day) | Should return stories completed on that exact day. Throughput chart has a single bar. | Edge case for daily standup use |
| Project with 1000+ completed stories in range | API must compute percentiles over 1000+ items. Sorting an array of 1000 numbers is trivial (sub-millisecond). | No performance concern for percentile calc |
| Activity record with malformed message (cannot parse status from message) | Fall back gracefully. Exclude that story from cycle time calculation. Log a warning. | Defensive parsing required |
| Timezone: team members in UTC+5 and UTC-8 | Activity timestamps are UTC. A story started at 9am UTC-8 (5pm UTC) and completed at 9am UTC+5 (4am UTC next day) shows as crossing a day boundary. | Use UTC consistently; document timezone behavior |
| Stories of type BUG vs FEATURE breakdown | `byType` response field should separate these. Bugs typically have shorter cycle times. | Verify breakdown is rendered as a table or chart |

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Cycle time API timeout (>30s on Vercel) | User sees loading spinner indefinitely, then error. | Add date range limits (max 6 months). Add API-side query timeout. |
| Activity table missing index on `[storyId, type, createdAt]` | Query to find "first STORY_MOVED to IN_PROGRESS" per story is slow. Current index is `[projectId, createdAt]` which helps for date filtering but not for per-story lookups. | Verify query plan. Consider adding index or denormalizing. |
| Stale SWR data after date range change | User changes date range, sees old data briefly before new data loads. | Use SWR `keepPreviousData: false` or show loading skeleton on parameter change. |
| Division by zero in throughput average | If the date range spans 0 complete weeks, `average = total / 0`. | Guard against zero division; show "N/A" for ranges < 1 week |

### Test Scenarios

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| F3-01 | Load cycle time page with 10+ completed stories, verify p50/p85/p95 values render | E2E | HIGH |
| F3-02 | Change date range, verify metrics update to reflect only stories completed in that range | E2E | HIGH |
| F3-03 | Project with 0 completed stories shows empty state with guidance message | E2E | HIGH |
| F3-04 | Verify lead time = `createdAt` to last DONE transition, not first | Unit | HIGH |
| F3-05 | Verify cycle time = first IN_PROGRESS to last DONE transition | Unit | HIGH |
| F3-06 | Story moved BACKLOG -> DONE directly has lead time but `null` cycle time | Unit | HIGH |
| F3-07 | Story moved DONE -> IN_PROGRESS -> DONE uses the final DONE timestamp | Unit | MEDIUM |
| F3-08 | Throughput chart shows correct weekly buckets for a 4-week range | E2E | MEDIUM |
| F3-09 | `byType` breakdown shows separate metrics for BUG vs FEATURE | E2E | MEDIUM |
| F3-10 | API returns 403 for unauthenticated user (no session) | Integration | HIGH |
| F3-11 | API returns valid JSON matching `CycleTimeResponse` schema for all inputs | Unit | HIGH |
| F3-12 | Verify metric cards have appropriate `aria-label` for screen readers | Accessibility | MEDIUM |
| F3-13 | Date range exceeding 6 months returns error or truncated result | Integration | MEDIUM |

### UX Improvement Suggestions

1. **Add tooltip definitions** for p50, p85, p95: "p50 (median): 50% of stories completed faster than this. p85: 85% of stories completed faster. p95: 95% of stories completed faster."
2. **Default date range** to "last 30 days" with presets: "Last 7 days", "Last 30 days", "Last 90 days", "This sprint", "Custom range."
3. **Trend arrows** on metric cards: show whether p50 is improving or degrading vs the previous period (e.g., last 30 days vs the 30 days before that).
4. **Color-code the trend line** green for improving (decreasing cycle time), red for degrading.
5. **Low sample size warning**: if fewer than 5 stories completed in the range, show "Low sample size -- metrics may not be representative."
6. **Add a scatter plot** option showing individual story cycle times as dots, with outliers highlighted. This helps teams identify specific stories that took unusually long.

---

## Feature 4: Agent Performance Dashboard

**Architect Estimate:** 1-1.5 weeks
**Current State:** Story model has `assignedToAgent`, `agentStatus` (RUNNING/COMPLETED/FAILED/null), `agentTriggeredAt`, `reviewedAt`. Activity records log `AGENT_TRIGGERED` events and rejection feedback. No agent analytics exist.

### UX Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Dashboard meaningless for users who have not used agents | HIGH | Many users on FREE plan (1 agent slot) may have never triggered an agent. The dashboard shows "0 triggered, 0% completion rate, no rejection patterns." This is a dead feature for them. |
| Rejection pattern parsing is fragile | MEDIUM | The architecture doc says to parse Activity messages containing "Review feedback:". This is string parsing on unstructured data. If the feedback message format changes, the parser breaks silently. |
| "First pass approval rate" definition unclear | MEDIUM | Users may not understand this metric. It means "stories approved without any rejection." Need a tooltip: "Percentage of agent stories that were approved on the first review, without being sent back for revision." |
| Agent duration calculation depends on Activity records | MEDIUM | Duration = `agentTriggeredAt` to the STORY_MOVED to REVIEW activity. If the agent fails without moving the story to REVIEW, there is no "end" event. For failed agents, duration could be `agentTriggeredAt` to the `AGENT_FAILED` activity (if one exists) or just "N/A". |
| Tab-based analytics page adds navigation complexity | LOW | With 4 tabs (velocity, burndown, cycle time, agents), users may not discover the agent tab. Consider adding a "Highlights" summary on the default overview tab that teases metrics from each sub-tab. |

### Edge Cases

| Edge Case | Expected Behavior | Risk |
|-----------|-------------------|------|
| 0 agent-triggered stories in the date range | Show empty state: "No agent activity in this period." | Must handle |
| Agent triggered but still RUNNING at query time | Should not count toward completion rate (exclude in-progress agents). Only count COMPLETED + FAILED. | Verify denominator excludes RUNNING |
| Agent COMPLETED but story was rejected multiple times | The agent completed its work, but the user rejected and re-triggered. Each trigger is a separate cycle. Must count each trigger independently. | Verify `agentTriggeredAt` resets on re-trigger |
| Agent FAILED with no Activity record (process crash) | `agentStatus = FAILED` but no `AGENT_FAILED` activity. Duration is unknown. | Show "N/A" for duration of failed agents with no end timestamp |
| All agent stories were approved first pass (100% approval rate) | Valid. Show 100% with a positive indicator. | No issue |
| All agent stories were rejected (0% first pass approval) | Valid. Show 0% with a warning indicator. | Highlight top rejection reasons prominently |
| Rejection feedback is empty string | `Review feedback:` followed by nothing. Should not appear in top rejection patterns. | Filter out empty/whitespace-only feedback |
| 50+ unique rejection reasons | `topRejectionReasons` should be capped (e.g., top 10) to avoid UI overflow. | Cap API response to top 10 |
| Agent triggered on a story that was later deleted | Story no longer exists. Activity records may still reference it. | Activity records have `storyId` but no cascade delete. Query should handle missing stories gracefully. |

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Agent performance API timeout | Loading spinner indefinitely. | Same mitigation as cycle time: date range limits, query optimization |
| `agentTriggeredAt` is null for a story with `assignedToAgent = true` | Duration calculation fails (null arithmetic). | Guard: skip stories where `agentTriggeredAt` is null |
| Activity message format changes (e.g., "Feedback:" instead of "Review feedback:") | Rejection pattern parser misses all feedback. Top rejection reasons shows empty. | Use a more robust pattern or store rejection feedback in a structured field |
| SWR cache shows stale agent data while agent is actively running | Dashboard shows "1 RUNNING" but agent already completed. | SWR refresh interval of 30s for the agent dashboard |

### Test Scenarios

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| F4-01 | Project with 10 agent stories (7 completed, 3 failed) shows correct completion rate (70%) | E2E | HIGH |
| F4-02 | First pass approval rate calculated correctly (exclude stories with rejection Activity) | Unit | HIGH |
| F4-03 | Average agent duration calculated correctly from `agentTriggeredAt` to REVIEW move | Unit | HIGH |
| F4-04 | Top rejection reasons extracted from Activity messages and sorted by frequency | Unit | HIGH |
| F4-05 | Project with 0 agent stories shows "No agent activity" empty state | E2E | HIGH |
| F4-06 | Trend chart shows weekly aggregated agent metrics over selected date range | E2E | MEDIUM |
| F4-07 | `byStoryType` breakdown separates FEATURE vs BUG agent completion rates | E2E | MEDIUM |
| F4-08 | API returns 403 for users without project access | Integration | HIGH |
| F4-09 | RUNNING agents are excluded from completion rate denominator | Unit | MEDIUM |
| F4-10 | Failed agents with null `agentTriggeredAt` show "N/A" duration, not NaN | Unit | MEDIUM |
| F4-11 | Dashboard renders correctly with screen reader (aria labels on summary cards) | Accessibility | MEDIUM |

### UX Improvement Suggestions

1. **Hide the agent dashboard tab** for projects that have never used agents. Show it only when `assignedToAgent: true` count > 0. This avoids showing a dead feature.
2. **Add a "Get started with agents" CTA** in the empty state, linking to agent documentation or settings.
3. **Color-code completion rate**: green for >80%, yellow for 50-80%, red for <50%.
4. **Show agent learning indicator**: "Agent has improved -- first pass approval rate increased from 40% (4 weeks ago) to 75% (this week)."
5. **Add rejection reason drill-down**: clicking a rejection reason shows the specific stories that were rejected with that feedback.
6. **Show agent duration distribution** as a histogram, not just an average. This reveals whether the agent is consistently fast or has outlier-slow executions.

---

## Feature 5: Usage-Based AI Add-On Packs

**Architect Estimate:** 3-5 days
**Current State:** `checkRewriteLimit()` in `plan-limits.ts` counts `STORY_REWRITTEN` Activity records per month against plan limits. Paddle integration exists for subscription billing. No credit pack model exists yet.

### UX Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Credit balance visibility | HIGH | Users need to see their remaining credits before they run out. The current rewrite limit error message (`plan-limits.ts` line 109) only appears AFTER the limit is hit. Need a proactive credit meter in the UI showing "X of Y rewrites used this month (+ Z from credit packs)." |
| FIFO consumption confusion | MEDIUM | Users may not understand that their oldest credit pack is consumed first. If a pack is about to expire, they may not realize it. Need clear indication of which pack is being drawn from. |
| Paddle checkout flow UX | MEDIUM | One-time purchases in Paddle open a checkout overlay or redirect. The transition from "Click Buy" to "Credits appear in balance" involves: click -> Paddle checkout -> payment -> webhook -> DB update -> UI refresh. This pipeline has latency (webhook delivery can take seconds). User may click "Buy," complete payment, and still see "0 credits" if the webhook has not processed yet. |
| Credit expiry surprise | HIGH | Credits expire at end of billing period (subscribed) or after 90 days (free). Users will be surprised when credits vanish. Need clear "Expires on DATE" labels and email notification before expiry. |
| Plan upgrade interaction | MEDIUM | If a FREE user with 10 purchased credits upgrades to PRO (50/month included), do the purchased credits stack on top? The architecture doc says yes (check plan limit first, then credit packs). But the user may expect the credits to "convert" or become unnecessary. Clear messaging needed. |
| Credit purchase on FREE plan with 15 stories limit | LOW | A FREE user can buy 50 AI credits but can only have 15 stories. They may never use all 50 credits because they hit the story limit first. The purchase page should warn: "Your plan allows 15 stories per project. Consider upgrading to Pro for unlimited stories." |
| No partial refund path | MEDIUM | If a user buys credits and then upgrades to PRO_MAX (unlimited rewrites), the purchased credits become worthless. No refund mechanism exists. |

### Edge Cases

| Edge Case | Expected Behavior | Risk |
|-----------|-------------------|------|
| User purchases credits while at plan limit | Credits should immediately allow additional rewrites. `checkRewriteLimit()` must check credit packs after plan limit is reached. | Architecture doc covers this flow |
| Two credit packs, oldest about to expire | FIFO: consume from oldest first. If oldest has 2 remaining and user needs 1, draw from oldest. | Must verify FIFO implementation |
| Credit pack with `expiresAt = null` (no expiry) | Should be consumed after all expiring packs (to preserve non-expiring credits). | FIFO by `purchasedAt` may not handle this well -- consider FIFO by `expiresAt` (soonest-expiring first) |
| Credit pack expires mid-month | User had 5 remaining credits from pack A (expiring March 31) and 10 from pack B (expiring June 30). On April 1, pack A's credits vanish. User goes from 15 remaining to 10. | Expiry must be checked at consumption time, not just purchase time |
| Concurrent AI rewrite requests consuming last credit | Two requests hit `checkRewriteLimit()` simultaneously. Both see 1 remaining credit. Both proceed. One credit is over-consumed. | Use database transaction with row locking to atomically increment `creditsUsed` |
| Paddle webhook fails/delayed | User completes payment, webhook not received. Credits not created in DB. User sees "0 credits" despite paying. | Show "Payment processing..." state. Add retry logic. Show Paddle transaction ID for support reference. |
| User buys 200-credit pack on free plan, uses 3, upgrades to PRO_MAX | 197 unused credits become redundant (PRO_MAX has unlimited rewrites). No refund. | Document in FAQ. Consider pausing credit pack consumption while on unlimited plan. |
| Organization with multiple members buying credit packs | Credits are org-level. Member A buys 10 credits, Member B consumes them all. Member A sees 0 credits. | Show "Credits are shared across your organization" label. Show who purchased and who consumed. |

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Paddle webhook `transaction.completed` never arrives | User paid but no credits. Support ticket. | Poll Paddle API as fallback after 5 minutes if no webhook. Show pending status. |
| `AiCreditPack` insert fails (DB error) | Webhook received but credits not created. User sees 0. | Webhook handler must be idempotent (check `transactionId` unique constraint before insert). Return 200 to Paddle to prevent retries only after successful insert. |
| `creditsUsed` increment race condition | Over-consumption as described above. | Use `prisma.aiCreditPack.update({ where: { id, creditsUsed: { lt: credits } }, data: { creditsUsed: { increment: 1 } } })` to atomically check-and-increment. |
| Credit balance query returns incorrect count (stale cache) | User sees wrong number. | No caching on credit balance queries. Always query DB. |
| Paddle checkout cancelled by user | No webhook fired. User sees unchanged balance. | No action needed, but track abandoned checkouts for analytics. |

### Test Scenarios

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| F5-01 | Purchase 10-credit pack, verify `AiCreditPack` record created with correct values | Integration | HIGH |
| F5-02 | User at plan rewrite limit, has credit pack with 5 remaining, verify rewrite is allowed | Unit | HIGH |
| F5-03 | User at plan limit with 0 credit pack credits, verify rewrite is denied with upgrade message | Unit | HIGH |
| F5-04 | FIFO consumption: two packs, oldest has 1 credit remaining. After 1 rewrite, oldest is exhausted, newer pack untouched. | Unit | HIGH |
| F5-05 | Expired credit pack is not counted in available balance | Unit | HIGH |
| F5-06 | Credit balance displayed correctly in billing settings page | E2E | HIGH |
| F5-07 | Paddle webhook with duplicate `transactionId` does not create duplicate credits (idempotency) | Integration | HIGH |
| F5-08 | Concurrent rewrite requests do not over-consume credits (race condition test) | Integration | MEDIUM |
| F5-09 | Credit pack purchase API requires org membership (OWNER or ADMIN role) | Integration | HIGH |
| F5-10 | FREE user sees credit pack purchase option with plan limitation warning | E2E | MEDIUM |
| F5-11 | PRO_MAX user does not see credit pack purchase option (unlimited rewrites) | E2E | MEDIUM |
| F5-12 | Credit balance API returns correct breakdown: plan remaining + pack remaining | Unit | HIGH |

### UX Improvement Suggestions

1. **Proactive credit meter** in the project header or sidebar showing "AI Rewrites: 12 of 15 used (3 remaining)" with a progress bar that turns yellow at 80% and red at 100%.
2. **"Running low" notification** when 80% of plan + credit pack credits are consumed. Toast or banner: "You have 3 AI rewrites remaining this month. Buy more credits or upgrade."
3. **Post-purchase confirmation** with clear "Credits added" feedback instead of relying on webhook latency. Show optimistic update: "Payment received -- credits will appear within 1 minute."
4. **Credit history log** showing purchase events and consumption events with timestamps.
5. **Pack comparison table** on purchase page showing cost-per-credit for each pack size (10 for $5 = $0.50/each, 50 for $20 = $0.40/each, 200 for $60 = $0.30/each).
6. **Auto-purchase option**: "Automatically buy a 10-credit pack when balance reaches 0." This requires additional Paddle integration for saved payment methods but eliminates workflow interruption.

---

## Cross-Feature Concerns

### Analytics Page Restructuring

All three analytics features (burndown, cycle time, agent dashboard) depend on restructuring the analytics page from a single server component to a tabbed client component with lazy-loaded SWR data per tab. This is a shared prerequisite and should be implemented first as a standalone task (estimate: 0.5-1 day).

**Proposed tab structure:**

```
Overview (default) | Velocity | Burndown | Cycle Time | Agents
```

The Overview tab should show summary cards from all tabs: current sprint burndown mini-chart, p50 cycle time this month, agent completion rate, velocity trend. This gives users a quick snapshot without navigating tabs.

### Shared Components Needed

| Component | Used By | Notes |
|-----------|---------|-------|
| Date range picker | Board filters, cycle time, agent dashboard, burndown | Shared component with presets (7d, 30d, 90d, custom) |
| Metric card | Cycle time (p50/p85/p95), agent dashboard (completion rate), burndown (sprint health) | Reusable card with value, label, trend arrow, and tooltip |
| Empty state | All features | Consistent "No data" message with relevant CTA |
| Loading skeleton | All charts | Consistent skeleton loader for chart areas |
| Sprint selector | Burndown, board filters | Dropdown listing sprints with status badges |

### Plan Tier Gating

| Feature | FREE | PRO | PRO_MAX |
|---------|------|-----|---------|
| Board filters (basic) | Full access | Full access | Full access |
| Board filters (agent status) | Hidden (1 agent slot, minimal use) | Visible | Visible |
| Burndown charts | Last 3 sprints only | Full history | Full history |
| Cycle time analytics | Last 30 days only | Full date range | Full date range |
| Agent performance dashboard | Hidden or read-only (1 agent) | Full access | Full access |
| AI credit packs | Available (with story limit warning) | Available | Hidden (unlimited) |

Recommendation: Do not hard-gate analytics features. Show all data to all users but add "Upgrade for full history" prompts on FREE tier when date ranges are restricted. This serves as a conversion funnel.

### Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Filter interaction latency | <50ms | Time from filter change to re-render |
| Chart render time | <200ms | Time from data loaded to chart visible |
| Analytics API response time | <2s for 90th percentile | Server-side, measured via response headers |
| Page load with analytics tabs | <3s total (including lazy-loaded default tab) | Lighthouse Performance score >80 |

---

## Accessibility Baseline

All new features must meet WCAG 2.1 AA compliance. Specific requirements:

| Requirement | Applies To | Test Method |
|-------------|-----------|-------------|
| All interactive elements have visible focus rings | Filters, tabs, chart controls | Manual + axe-core |
| Charts have text alternatives | Burndown, cycle time, throughput, agent trend | `aria-label` on chart container with summary text |
| Color is not the only differentiator | All charts (ideal vs actual, ahead vs behind) | Add patterns/shapes in addition to color |
| Keyboard navigable | Filter dropdowns, tab switching, sprint selector | Tab + Enter + Escape |
| Screen reader announces filter state changes | Board filters | `aria-live="polite"` region for "X stories match filters" |
| Sufficient contrast ratio (4.5:1 for text, 3:1 for UI) | All new UI elements | Contrast checker |

---

## Risk Summary Matrix

| Feature | UX Risk | Technical Risk | Testing Effort | Overall Risk |
|---------|---------|---------------|----------------|-------------|
| Board Search and Filters | LOW (mostly polish) | LOW (client-side only) | MEDIUM (12 test cases) | LOW |
| Burndown Charts | MEDIUM (empty states, timezone) | LOW (simple queries) | MEDIUM (10 test cases) | MEDIUM |
| Cycle Time / Lead Time | MEDIUM (complex metrics, UX clarity) | MEDIUM (Activity parsing, query perf) | HIGH (13 test cases) | MEDIUM |
| Agent Performance Dashboard | MEDIUM (relevance to non-agent users) | MEDIUM (string parsing for rejections) | MEDIUM (11 test cases) | MEDIUM |
| Usage-Based AI Add-On Packs | HIGH (payment UX, expiry, race conditions) | MEDIUM (Paddle webhook, concurrency) | HIGH (12 test cases) | HIGH |

**Recommended build order from a QA perspective:**

1. **Analytics page tab restructuring** (prerequisite, 0.5-1 day)
2. **Board Search and Filters** (lowest risk, fastest to validate)
3. **Burndown Charts** (low technical risk, moderate UX validation)
4. **Cycle Time Analytics** (moderate complexity, needs careful edge case testing)
5. **Agent Performance Dashboard** (moderate complexity, can share patterns from cycle time)
6. **Usage-Based AI Add-On Packs** (highest risk -- payment flows need thorough E2E testing with Paddle sandbox)

Total estimated test cases: 58 across all features. Estimated test writing effort: 3-4 days for unit/integration tests, 2-3 days for E2E tests.
