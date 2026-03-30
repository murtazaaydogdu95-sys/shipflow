# Phase 4: Polish -- Architecture Design

## Overview

Phase 4 adds four polish features to CodePylot: Org Chart Visualization, Issue Hierarchy (sub-tasks), Execution Workspaces, and Read State / Inbox. This document defines schema changes, API routes, component specifications, file paths, and implementation order.

---

## 1. Prisma Schema Changes

### 1.1 Story -- Sub-task Hierarchy (already partially exists)

The schema already has `parentId`, `parent`, and `children` on the Story model (added during Phase 3). No schema migration needed for sub-tasks. The existing fields:

```prisma
// Already in schema.prisma (Story model, lines 213, 239-240):
parentId    String?
parent      Story?   @relation("StoryParent", fields: [parentId], references: [id], onDelete: SetNull)
children    Story[]  @relation("StoryParent")
// Index already exists: @@index([parentId])
```

### 1.2 ExecutionWorkspace (new model)

```prisma
model ExecutionWorkspace {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  agentId     String?
  agent       Agent?   @relation(fields: [agentId], references: [id], onDelete: SetNull)
  path        String
  repoUrl     String?
  branch      String?
  baseRef     String   @default("main")
  status      String   @default("active") // active, closed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
  @@index([agentId])
  @@index([projectId, agentId])
  @@index([status])
}
```

**Relation additions required:**

```prisma
// Add to Project model:
workspaces  ExecutionWorkspace[]

// Add to Agent model:
workspaces  ExecutionWorkspace[]
```

### 1.3 ReadState (new model)

```prisma
model ReadState {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  entityType String   // "story", "comment", "approval", "notification"
  entityId   String
  readAt     DateTime @default(now())

  @@unique([userId, entityType, entityId])
  @@index([userId, entityType])
  @@index([entityId])
}
```

**Relation addition required:**

```prisma
// Add to User model:
readStates  ReadState[]
```

### 1.4 Full Migration Summary

| Model              | Action  | Relations touched            |
|-------------------|---------|------------------------------|
| Story             | No change | parentId/parent/children already exist |
| ExecutionWorkspace | Create  | Project.workspaces, Agent.workspaces |
| ReadState          | Create  | User.readStates              |

---

## 2. API Routes

### 2.1 Sub-task APIs

These extend the existing story routes. No new route directories needed for basic CRUD since `POST /api/projects/[projectId]/stories` already accepts all Story fields. We add `parentId` support to existing handlers.

| Method | Path | Purpose | Changes |
|--------|------|---------|---------|
| GET | `/api/projects/[projectId]/stories/[storyId]` | Story detail | Include `children` with `{ select: { id, shortId, title, status, priority, type, storyPoints, assigneeId } }` |
| POST | `/api/projects/[projectId]/stories` | Create story | Accept optional `parentId`; validate parent exists in same project; inherit `projectId` from parent if provided |
| PATCH | `/api/projects/[projectId]/stories/[storyId]` | Update story | Accept `parentId` (nullable) for reparenting |
| GET | `/api/projects/[projectId]/stories?parentId=X` | List sub-tasks | Filter by parentId; also support `parentId=null` for root stories only |

**Validation rules (Zod):**
- `parentId` must reference a story in the same `projectId`
- A story cannot be its own parent
- Max nesting depth: 1 (sub-tasks cannot have sub-tasks -- enforced server-side)
- Moving a parent story to a different project is blocked if it has children

### 2.2 Org Chart APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/orgs/[orgId]/agents/tree` | Return flat agent list with `reportsTo` populated (client builds tree) |
| PATCH | `/api/orgs/[orgId]/agents/[agentId]` | Update `reportsTo` (already exists, just needs to accept this field) |

**Response shape for `/agents/tree`:**

```typescript
interface AgentTreeNode {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: string;
  reportsTo: string | null;
  storiesCompleted: number;
  subordinateCount: number;
}
// Returns: AgentTreeNode[]
```

**Validation:**
- `reportsTo` must reference an agent in the same org
- Circular hierarchy check: walk up chain from target, reject if it reaches self
- Agent cannot report to itself

### 2.3 Execution Workspace APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects/[projectId]/workspaces` | List workspaces for project |
| POST | `/api/projects/[projectId]/workspaces` | Create workspace (manual or from agent-executor) |
| GET | `/api/projects/[projectId]/workspaces/[workspaceId]` | Get workspace detail |
| PATCH | `/api/projects/[projectId]/workspaces/[workspaceId]` | Update workspace (status, branch) |
| DELETE | `/api/projects/[projectId]/workspaces/[workspaceId]` | Close and cleanup workspace |

**Request body for POST:**

```typescript
interface CreateWorkspaceBody {
  agentId?: string;
  path: string;         // validated with sanitizePath
  repoUrl?: string;
  branch?: string;
  baseRef?: string;     // defaults to "main"
}
```

**Security:**
- All routes use `requireProjectAccess()`
- `path` validated against directory traversal via `sanitizePath()`
- `repoUrl` validated via `isPublicUrl()` (SSRF prevention)

### 2.4 Read State / Inbox APIs

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/read-state` | Mark entity as read |
| DELETE | `/api/read-state` | Mark entity as unread |
| GET | `/api/inbox` | Get unread items for current user |
| GET | `/api/inbox/count` | Get unread count by entity type |

**POST `/api/read-state` body:**

```typescript
interface MarkReadBody {
  entityType: "story" | "comment" | "approval" | "notification";
  entityId: string;
}
```

**GET `/api/inbox` query params:**

```
?type=story|comment|approval|notification  (optional filter)
&projectId=xxx                              (optional scope)
&limit=20                                   (pagination, default 20)
&cursor=xxx                                 (cursor-based pagination)
```

**GET `/api/inbox` response:**

```typescript
interface InboxResponse {
  items: Array<{
    entityType: string;
    entityId: string;
    title: string;
    summary: string;
    href: string;
    updatedAt: string;
    projectName?: string;
  }>;
  nextCursor: string | null;
  counts: {
    story: number;
    comment: number;
    approval: number;
    notification: number;
    total: number;
  };
}
```

**Implementation notes:**
- Inbox items are computed by querying entities the user is involved with (assigned stories, project membership) and LEFT JOINing against ReadState
- Stories: unread = story updated since last ReadState.readAt for that story
- Comments: unread = comments on assigned stories since last read
- Approvals: unread = pending approvals where user is org OWNER/ADMIN
- Uses existing `Notification` model's `read` field for backward compatibility; ReadState extends this to stories, comments, and approvals

---

## 3. Components

### 3.1 Org Chart

| Component | Path | Purpose |
|-----------|------|---------|
| `OrgChartPage` | `src/app/org/[slug]/org-chart/page.tsx` | Server component, fetches org + redirects if needed |
| `OrgChartClient` | `src/components/agents/org-chart-client.tsx` | Client component, renders interactive tree |
| `OrgChartNode` | `src/components/agents/org-chart-node.tsx` | Single agent node card |

**OrgChartClient design:**
- Fetches from `/api/orgs/[orgId]/agents/tree` via SWR
- Builds tree from flat list using `reportsTo` field
- CSS flexbox-based tree layout (no external library)
- SVG `<line>` elements connecting parent to children
- Drag-and-drop reparenting via native drag events (PATCH `reportsTo`)
- Click node to navigate to agent detail page
- Responsive: horizontal tree on desktop, vertical on mobile

**OrgChartNode design:**
- Shows: icon/avatar, name, role badge, status indicator
- Hover: shows storiesCompleted count
- Active class when dragging over (drop target highlight)
- data-testid: `org-chart-node-{agentName}`

### 3.2 Sub-task Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SubTaskList` | `src/components/stories/sub-task-list.tsx` | Collapsible list of child stories |
| `SubTaskCreateButton` | `src/components/stories/sub-task-create-button.tsx` | Inline form to add sub-task |
| `SubTaskProgressBar` | `src/components/stories/sub-task-progress-bar.tsx` | Shows X/Y completed |

**Integration points:**
- `StoryDetailModal`: Add "Sub-tasks" tab after "Details" tab
- `KanbanCard` (board): Show `SubTaskProgressBar` when `children.length > 0`
- Story creation form: Accept `parentId` from query param or context

**SubTaskList design:**
- Collapsible accordion (default open)
- Each row: checkbox (toggle status TODO/DONE), shortId, title, priority badge, assignee avatar
- Click row opens sub-task in StoryDetailModal
- "Add sub-task" button at bottom opens inline form
- data-testid: `sub-task-list`, `sub-task-row-{shortId}`

**SubTaskProgressBar design:**
- Thin bar below story card title on kanban board
- Color: green fill proportional to DONE children count
- Text: "2/5" format, only shown if children exist
- data-testid: `sub-task-progress-{storyId}`

### 3.3 Execution Workspace Components

| Component | Path | Purpose |
|-----------|------|---------|
| `WorkspaceList` | `src/components/workspaces/workspace-list.tsx` | List workspaces for a project |
| `WorkspaceCard` | `src/components/workspaces/workspace-card.tsx` | Single workspace card |
| `WorkspaceCreateDialog` | `src/components/workspaces/workspace-create-dialog.tsx` | Dialog to create new workspace |

**Integration points:**
- Project settings page: Add "Workspaces" tab
- Agent detail page: Show associated workspace(s)
- `agent-executor.ts`: Use workspace instead of `project.agentWorkingDir` when available

**WorkspaceCard design:**
- Shows: path (truncated), branch name, agent name (if assigned), status badge
- Actions: Close button, Copy path button
- Status colors: active = green, closed = gray

### 3.4 Inbox / Read State Components

| Component | Path | Purpose |
|-----------|------|---------|
| `InboxPage` | `src/app/inbox/page.tsx` | Server component for inbox page |
| `InboxClient` | `src/components/inbox/inbox-client.tsx` | Client component with filters and list |
| `InboxItem` | `src/components/inbox/inbox-item.tsx` | Single inbox item row |
| `InboxFilters` | `src/components/inbox/inbox-filters.tsx` | Type filter tabs |
| `UnreadBadge` | `src/components/ui/unread-badge.tsx` | Reusable unread dot/count badge |

**Integration points:**
- `NotificationBell`: Add inbox count to badge total; link "View all" to `/inbox`
- `StoryDetailModal`: Call `POST /api/read-state` when opening a story
- `KanbanCard`: Show `UnreadBadge` on cards with unread updates
- Sidebar navigation: Add "Inbox" link with unread count badge

**InboxClient design:**
- SWR fetch from `/api/inbox` with `refreshInterval: 30000`
- Tab filters: All | Stories | Comments | Approvals
- Each item: icon by type, title, summary snippet, time ago, project name
- Click navigates to entity, marks as read
- "Mark all read" button per filter tab
- data-testid: `inbox-list`, `inbox-item-{entityId}`, `inbox-filter-{type}`

---

## 4. File List

### Schema
```
prisma/schema.prisma                                          (modify -- add ExecutionWorkspace, ReadState models)
```

### API Routes
```
src/app/api/orgs/[orgId]/agents/tree/route.ts                (new -- GET agent hierarchy)
src/app/api/projects/[projectId]/workspaces/route.ts          (new -- GET list, POST create)
src/app/api/projects/[projectId]/workspaces/[workspaceId]/route.ts  (new -- GET, PATCH, DELETE)
src/app/api/read-state/route.ts                               (new -- POST mark read, DELETE mark unread)
src/app/api/inbox/route.ts                                    (new -- GET inbox items)
src/app/api/inbox/count/route.ts                              (new -- GET unread counts)
```

### Existing API Route Modifications
```
src/app/api/projects/[projectId]/stories/route.ts             (modify -- accept parentId on POST, filter by parentId on GET)
src/app/api/projects/[projectId]/stories/[storyId]/route.ts   (modify -- include children on GET, accept parentId on PATCH)
```

### Pages
```
src/app/org/[slug]/org-chart/page.tsx                         (new -- org chart page)
src/app/inbox/page.tsx                                        (new -- inbox page)
```

### Components
```
src/components/agents/org-chart-client.tsx                     (new)
src/components/agents/org-chart-node.tsx                       (new)
src/components/stories/sub-task-list.tsx                       (new)
src/components/stories/sub-task-create-button.tsx              (new)
src/components/stories/sub-task-progress-bar.tsx               (new)
src/components/workspaces/workspace-list.tsx                   (new)
src/components/workspaces/workspace-card.tsx                   (new)
src/components/workspaces/workspace-create-dialog.tsx          (new)
src/components/inbox/inbox-client.tsx                          (new)
src/components/inbox/inbox-item.tsx                            (new)
src/components/inbox/inbox-filters.tsx                         (new)
src/components/ui/unread-badge.tsx                             (new)
```

### Existing Component Modifications
```
src/components/stories/story-detail-modal.tsx                  (modify -- add Sub-tasks tab, call read-state on open)
src/components/board/kanban-board.tsx                           (modify -- show sub-task progress on cards)
src/components/layout/notification-bell.tsx                     (modify -- add inbox link, incorporate read-state counts)
```

### Lib / Utilities
```
src/lib/agent-executor.ts                                      (modify -- use ExecutionWorkspace when available)
src/lib/validations/workspace.ts                               (new -- Zod schemas for workspace input)
src/lib/validations/read-state.ts                              (new -- Zod schemas for read-state input)
src/lib/inbox.ts                                               (new -- inbox query builder)
```

### Tests
```
tests/api/agents-tree.test.ts                                  (new)
tests/api/workspaces.test.ts                                   (new)
tests/api/read-state.test.ts                                   (new)
tests/api/inbox.test.ts                                        (new)
tests/api/stories-subtasks.test.ts                             (new)
tests/components/org-chart.test.tsx                             (new)
tests/components/sub-task-list.test.tsx                         (new)
tests/components/inbox.test.tsx                                 (new)
```

---

## 5. Implementation Order

Implementation is sequenced by dependency: schema first, then APIs, then UI. Features are ordered by risk (lowest risk first) and value.

### Batch 1: Schema Migration (prerequisite for all features)

1. **Add `ExecutionWorkspace` model** to `prisma/schema.prisma`
2. **Add `ReadState` model** to `prisma/schema.prisma`
3. **Add relation fields** to `Project`, `Agent`, and `User` models
4. Run `npx prisma generate` and `npx prisma db push`
5. Verify build passes

### Batch 2: Issue Hierarchy / Sub-tasks (schema already exists)

6. **Modify story GET route** to include `children` in response
7. **Modify story POST route** to accept and validate `parentId`
8. **Modify story PATCH route** to accept `parentId` for reparenting
9. **Add `parentId` filter** to story list GET route
10. **Create `SubTaskList` component**
11. **Create `SubTaskCreateButton` component**
12. **Create `SubTaskProgressBar` component**
13. **Integrate Sub-tasks tab** into `StoryDetailModal`
14. **Show progress bar** on kanban board cards
15. **Write tests** for sub-task API and components

### Batch 3: Org Chart Visualization

16. **Create `/api/orgs/[orgId]/agents/tree` route** (GET)
17. **Add circular hierarchy validation** to agent PATCH route
18. **Create `OrgChartClient` component** with CSS tree layout
19. **Create `OrgChartNode` component**
20. **Create org chart page** at `src/app/org/[slug]/org-chart/page.tsx`
21. **Add drag-and-drop reparenting** (PATCH reportsTo)
22. **Write tests** for tree API and org chart component

### Batch 4: Execution Workspaces

23. **Create Zod validation schemas** for workspace input
24. **Create workspace CRUD API routes** (GET/POST/PATCH/DELETE)
25. **Create `WorkspaceList` and `WorkspaceCard` components**
26. **Create `WorkspaceCreateDialog` component**
27. **Integrate workspaces tab** into project settings
28. **Modify `agent-executor.ts`** to use workspace when available
29. **Write tests** for workspace API and components

### Batch 5: Read State / Inbox

30. **Create Zod validation schemas** for read-state input
31. **Create `POST /api/read-state` route**
32. **Create `GET /api/inbox` route** with query builder
33. **Create `GET /api/inbox/count` route**
34. **Create `InboxClient`, `InboxItem`, `InboxFilters` components**
35. **Create `UnreadBadge` component**
36. **Create inbox page** at `src/app/inbox/page.tsx`
37. **Modify `StoryDetailModal`** to mark story as read on open
38. **Modify `NotificationBell`** to include inbox link and read-state counts
39. **Add unread badges** to kanban board cards
40. **Write tests** for read-state API, inbox API, and inbox components

---

## 6. Architecture Decisions

### ADR-1: Single-level sub-tasks only
Sub-tasks cannot themselves have children. This avoids recursive query complexity, keeps the board UI clean, and matches the 80/20 of project management tools. Enforced server-side in the story POST/PATCH handlers.

### ADR-2: CSS-only org chart (no library dependency)
The org chart uses CSS flexbox for tree layout and SVG lines for connectors. This avoids adding a new dependency (react-flow, d3, etc.) and keeps the bundle small. Agent hierarchies are typically shallow (2-3 levels) so this approach is sufficient.

### ADR-3: ReadState as separate model (not extending Notification)
The existing `Notification` model has a `read` boolean but is limited to push-style notifications. `ReadState` tracks whether a user has seen any entity (story, comment, approval). This separation allows inbox queries without polluting the notification pipeline and enables "mark as unread" without notification side effects.

### ADR-4: Workspace-first agent execution
When an `ExecutionWorkspace` exists for a project+agent combination, `agent-executor.ts` uses `workspace.path` instead of `project.agentWorkingDir`. This is backward compatible: if no workspace exists, the existing `agentWorkingDir` behavior continues. Workspaces are created automatically on first agent spawn if the project has no `agentWorkingDir` set.

### ADR-5: Inbox is computed, not materialized
The inbox query joins multiple tables (stories, comments, approvals) against `ReadState` rather than maintaining a materialized inbox table. For the expected scale (hundreds of items per user), this approach keeps writes simple and avoids sync issues. If performance becomes a concern, a materialized view or background job can be added later.
