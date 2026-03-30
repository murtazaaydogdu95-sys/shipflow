# Phase 2: Control & Governance -- Architecture Document

## Overview

Phase 2 introduces three governance pillars: **Budget Policies** (cost guardrails), **Approval Workflows** (human-in-the-loop gates), and **Goal Alignment** (strategic direction for agents). These features build on the Phase 1 Agent and CostEvent models, adding enforcement hooks into the existing agent-trigger and agent-executor pipelines.

---

## 1. Prisma Schema Changes

### 1.1 New Model: BudgetPolicy

```prisma
model BudgetPolicy {
  id              String   @id @default(cuid())
  orgId           String
  org             Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  scope           String   // "org", "agent", "project"
  scopeId         String?  // agentId or projectId (null for org scope)
  metric          String   @default("cost_cents")
  window          String   @default("calendar_month") // "calendar_month", "lifetime"
  amountCents     Int      // budget limit in cents
  warnPercent     Int      @default(80)
  hardStopEnabled Boolean  @default(true)
  notifyEnabled   Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  incidents       BudgetIncident[]

  @@index([orgId])
  @@index([orgId, scope, scopeId])
}
```

### 1.2 New Model: BudgetIncident

```prisma
model BudgetIncident {
  id            String    @id @default(cuid())
  policyId      String
  policy        BudgetPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  type          String    // "soft_warning", "hard_stop"
  currentCents  Int
  limitCents    Int
  resolvedAt    DateTime?
  approvalId    String?   // links to Approval for budget override
  createdAt     DateTime  @default(now())

  @@index([policyId])
  @@index([policyId, type])
}
```

### 1.3 New Model: Approval

```prisma
model Approval {
  id            String    @id @default(cuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  type          String    // "hire_agent", "budget_override"
  status        String    @default("pending") // "pending", "approved", "rejected", "revision_requested"
  payload       Json      // context-specific data (see section 5)
  requestedById String
  requestedBy   User      @relation("ApprovalRequester", fields: [requestedById], references: [id])
  decidedById   String?
  decidedBy     User?     @relation("ApprovalDecider", fields: [decidedById], references: [id])
  decidedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  comments      ApprovalComment[]

  @@index([orgId, status])
  @@index([orgId, type])
  @@index([requestedById])
}
```

### 1.4 New Model: ApprovalComment

```prisma
model ApprovalComment {
  id         String   @id @default(cuid())
  approvalId String
  approval   Approval @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  content    String
  createdAt  DateTime @default(now())

  @@index([approvalId, createdAt])
}
```

### 1.5 New Model: Goal

```prisma
model Goal {
  id            String   @id @default(cuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  level         String   @default("project") // "company", "team", "project"
  status        String   @default("planned") // "planned", "active", "completed"
  parentId      String?
  parent        Goal?    @relation("GoalHierarchy", fields: [parentId], references: [id])
  children      Goal[]   @relation("GoalHierarchy")
  ownerAgentId  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  stories       Story[]  @relation("StoryGoal")

  @@index([orgId])
  @@index([orgId, level])
  @@index([parentId])
  @@index([ownerAgentId])
}
```

### 1.6 Modified Model: Organization

Add governance flags:

```prisma
model Organization {
  // ... existing fields ...
  requireApprovalForAgents Boolean @default(false)
  budgetPolicies           BudgetPolicy[]
  approvals                Approval[]
  goals                    Goal[]
}
```

### 1.7 Modified Model: Story

Add goal linkage:

```prisma
model Story {
  // ... existing fields ...
  goalId    String?
  goal      Goal?    @relation("StoryGoal", fields: [goalId], references: [id], onDelete: SetNull)

  @@index([goalId])
}
```

### 1.8 Modified Model: User

Add approval relations:

```prisma
model User {
  // ... existing fields ...
  requestedApprovals  Approval[]        @relation("ApprovalRequester")
  decidedApprovals    Approval[]        @relation("ApprovalDecider")
  approvalComments    ApprovalComment[]
}
```

### 1.9 Complete Schema Additions (copy-paste ready)

```prisma
// ---- Add to schema.prisma after existing models ----

model BudgetPolicy {
  id              String           @id @default(cuid())
  orgId           String
  org             Organization     @relation(fields: [orgId], references: [id], onDelete: Cascade)
  scope           String
  scopeId         String?
  metric          String           @default("cost_cents")
  window          String           @default("calendar_month")
  amountCents     Int
  warnPercent     Int              @default(80)
  hardStopEnabled Boolean          @default(true)
  notifyEnabled   Boolean          @default(true)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  incidents       BudgetIncident[]

  @@index([orgId])
  @@index([orgId, scope, scopeId])
}

model BudgetIncident {
  id            String       @id @default(cuid())
  policyId      String
  policy        BudgetPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  type          String
  currentCents  Int
  limitCents    Int
  resolvedAt    DateTime?
  approvalId    String?
  createdAt     DateTime     @default(now())

  @@index([policyId])
  @@index([policyId, type])
}

model Approval {
  id            String            @id @default(cuid())
  orgId         String
  org           Organization      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  type          String
  status        String            @default("pending")
  payload       Json
  requestedById String
  requestedBy   User              @relation("ApprovalRequester", fields: [requestedById], references: [id])
  decidedById   String?
  decidedBy     User?             @relation("ApprovalDecider", fields: [decidedById], references: [id])
  decidedAt     DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  comments      ApprovalComment[]

  @@index([orgId, status])
  @@index([orgId, type])
  @@index([requestedById])
}

model ApprovalComment {
  id         String   @id @default(cuid())
  approvalId String
  approval   Approval @relation(fields: [approvalId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  content    String
  createdAt  DateTime @default(now())

  @@index([approvalId, createdAt])
}

model Goal {
  id            String   @id @default(cuid())
  orgId         String
  org           Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  level         String   @default("project")
  status        String   @default("planned")
  parentId      String?
  parent        Goal?    @relation("GoalHierarchy", fields: [parentId], references: [id])
  children      Goal[]   @relation("GoalHierarchy")
  ownerAgentId  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  stories       Story[]  @relation("StoryGoal")

  @@index([orgId])
  @@index([orgId, level])
  @@index([parentId])
  @@index([ownerAgentId])
}
```

Add to Organization:
```prisma
  requireApprovalForAgents Boolean        @default(false)
  budgetPolicies           BudgetPolicy[]
  approvals                Approval[]
  goals                    Goal[]
```

Add to Story:
```prisma
  goalId    String?
  goal      Goal?    @relation("StoryGoal", fields: [goalId], references: [id], onDelete: SetNull)
  @@index([goalId])
```

Add to User:
```prisma
  requestedApprovals  Approval[]        @relation("ApprovalRequester")
  decidedApprovals    Approval[]        @relation("ApprovalDecider")
  approvalComments    ApprovalComment[]
```

---

## 2. API Routes

### 2.1 Budget Policy CRUD

All routes require org membership via `requireOrgPermission(userId, orgId, "org:settings")` (OWNER or ADMIN only).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orgs/[orgId]/budget-policies` | List all budget policies for the org |
| POST | `/api/orgs/[orgId]/budget-policies` | Create a budget policy |
| GET | `/api/orgs/[orgId]/budget-policies/[policyId]` | Get policy with incidents |
| PATCH | `/api/orgs/[orgId]/budget-policies/[policyId]` | Update policy |
| DELETE | `/api/orgs/[orgId]/budget-policies/[policyId]` | Delete policy |
| GET | `/api/orgs/[orgId]/budget-policies/[policyId]/incidents` | List incidents for a policy |

#### POST /api/orgs/[orgId]/budget-policies -- Request Body

```typescript
{
  scope: "org" | "agent" | "project";
  scopeId?: string;        // required when scope is "agent" or "project"
  metric?: "cost_cents";   // default "cost_cents", extensible later
  window?: "calendar_month" | "lifetime";
  amountCents: number;     // positive integer
  warnPercent?: number;    // 1-99, default 80
  hardStopEnabled?: boolean;
  notifyEnabled?: boolean;
}
```

#### Validation (Zod schema in `src/lib/validations/budget-policy.ts`)

```typescript
import { z } from "zod";

export const createBudgetPolicySchema = z.object({
  scope: z.enum(["org", "agent", "project"]),
  scopeId: z.string().cuid().optional(),
  metric: z.enum(["cost_cents"]).default("cost_cents"),
  window: z.enum(["calendar_month", "lifetime"]).default("calendar_month"),
  amountCents: z.number().int().positive().max(100_000_00), // max $100,000
  warnPercent: z.number().int().min(1).max(99).default(80),
  hardStopEnabled: z.boolean().default(true),
  notifyEnabled: z.boolean().default(true),
}).refine(
  (data) => data.scope === "org" || !!data.scopeId,
  { message: "scopeId is required for agent and project scopes", path: ["scopeId"] }
);

export const updateBudgetPolicySchema = createBudgetPolicySchema.partial().omit({ scope: true, scopeId: true });
```

### 2.2 Budget Check Endpoint (Internal)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orgs/[orgId]/budget-status` | Get current spend vs. all active policies |

Response:

```typescript
{
  policies: Array<{
    id: string;
    scope: string;
    scopeId: string | null;
    amountCents: number;
    currentSpendCents: number;
    percentUsed: number;
    status: "ok" | "warning" | "exceeded";
  }>;
  allowed: boolean; // false if any hard-stop policy is exceeded
}
```

### 2.3 Approval CRUD

OWNER/ADMIN can decide approvals. Any member can request (for hire_agent) or view.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orgs/[orgId]/approvals` | List approvals (filterable by status, type) |
| POST | `/api/orgs/[orgId]/approvals` | Create an approval request |
| GET | `/api/orgs/[orgId]/approvals/[approvalId]` | Get approval detail with comments |
| PATCH | `/api/orgs/[orgId]/approvals/[approvalId]` | Approve, reject, or request revision |
| POST | `/api/orgs/[orgId]/approvals/[approvalId]/comments` | Add a comment |

#### POST /api/orgs/[orgId]/approvals -- Request Body

```typescript
{
  type: "hire_agent" | "budget_override";
  payload: {
    // For hire_agent:
    agentName?: string;
    agentRole?: string;
    agentConfig?: Record<string, unknown>;

    // For budget_override:
    policyId?: string;
    incidentId?: string;
    requestedAmountCents?: number;
    reason?: string;
  };
}
```

#### PATCH /api/orgs/[orgId]/approvals/[approvalId] -- Request Body

```typescript
{
  status: "approved" | "rejected" | "revision_requested";
  reason?: string; // required for rejection/revision
}
```

#### Validation (Zod schema in `src/lib/validations/approval.ts`)

```typescript
import { z } from "zod";

export const APPROVAL_TYPES = ["hire_agent", "budget_override"] as const;
export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "revision_requested"] as const;

export const createApprovalSchema = z.object({
  type: z.enum(APPROVAL_TYPES),
  payload: z.record(z.unknown()),
});

export const decideApprovalSchema = z.object({
  status: z.enum(["approved", "rejected", "revision_requested"]),
  reason: z.string().max(2000).optional(),
}).refine(
  (data) => data.status === "approved" || !!data.reason,
  { message: "Reason is required for rejection or revision request", path: ["reason"] }
);

export const approvalCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});
```

### 2.4 Goal CRUD

OWNER/ADMIN can create and manage goals. Members can view.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orgs/[orgId]/goals` | List goals (filterable by level, status) |
| POST | `/api/orgs/[orgId]/goals` | Create a goal |
| GET | `/api/orgs/[orgId]/goals/[goalId]` | Get goal detail with children and linked stories |
| PATCH | `/api/orgs/[orgId]/goals/[goalId]` | Update goal |
| DELETE | `/api/orgs/[orgId]/goals/[goalId]` | Delete goal (cascades children to parentId=null) |
| GET | `/api/orgs/[orgId]/goals/tree` | Get full goal hierarchy as a tree |

#### POST /api/orgs/[orgId]/goals -- Request Body

```typescript
{
  title: string;
  description?: string;
  level: "company" | "team" | "project";
  status?: "planned" | "active" | "completed";
  parentId?: string;
  ownerAgentId?: string;
}
```

#### Validation (Zod schema in `src/lib/validations/goal.ts`)

```typescript
import { z } from "zod";

export const GOAL_LEVELS = ["company", "team", "project"] as const;
export const GOAL_STATUSES = ["planned", "active", "completed"] as const;

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  level: z.enum(GOAL_LEVELS).default("project"),
  status: z.enum(GOAL_STATUSES).default("planned"),
  parentId: z.string().cuid().optional(),
  ownerAgentId: z.string().cuid().optional(),
});

export const updateGoalSchema = createGoalSchema.partial();
```

### 2.5 Story Goal Assignment

Modify existing story PATCH endpoint to accept `goalId`:

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/projects/[projectId]/stories/[storyId]` (existing) | Add `goalId` to updatable fields |

---

## 3. Components

### 3.1 New Pages

| File | Description |
|------|-------------|
| `src/app/(dashboard)/orgs/[orgId]/budget/page.tsx` | Budget policies list with spend gauges |
| `src/app/(dashboard)/orgs/[orgId]/approvals/page.tsx` | Approval queue (pending, decided) |
| `src/app/(dashboard)/orgs/[orgId]/approvals/[approvalId]/page.tsx` | Approval detail with timeline and comments |
| `src/app/(dashboard)/orgs/[orgId]/goals/page.tsx` | Goal tree view |

### 3.2 New Components -- Budget

| File | Description |
|------|-------------|
| `src/components/budget/budget-policy-list.tsx` | List of policies with spend progress bars |
| `src/components/budget/budget-policy-form.tsx` | Create/edit budget policy dialog |
| `src/components/budget/budget-gauge.tsx` | Circular or linear gauge showing spend vs limit |
| `src/components/budget/budget-incident-list.tsx` | List of incidents for a policy |
| `src/components/budget/budget-banner.tsx` | Warning/error banner shown when budget thresholds hit |

### 3.3 New Components -- Approvals

| File | Description |
|------|-------------|
| `src/components/approvals/approval-list.tsx` | Filterable list of approvals with status badges |
| `src/components/approvals/approval-card.tsx` | Single approval card with requester, type, payload summary |
| `src/components/approvals/approval-detail.tsx` | Full detail view with timeline, payload, decision buttons |
| `src/components/approvals/approval-actions.tsx` | Approve/reject/revision buttons with reason dialog |
| `src/components/approvals/approval-badge.tsx` | Status badge (pending=yellow, approved=green, rejected=red) |
| `src/components/approvals/approval-comment-list.tsx` | Comment thread for an approval |

### 3.4 New Components -- Goals

| File | Description |
|------|-------------|
| `src/components/goals/goal-tree.tsx` | Hierarchical tree view of goals (collapsible) |
| `src/components/goals/goal-card.tsx` | Single goal card with linked story count and progress |
| `src/components/goals/goal-form.tsx` | Create/edit goal dialog with parent selector |
| `src/components/goals/goal-picker.tsx` | Dropdown selector for assigning a goal to a story |
| `src/components/goals/goal-progress.tsx` | Progress indicator based on linked story completion |

### 3.5 Modified Components

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Add "Budget", "Approvals", "Goals" links to org-level navigation |
| `src/components/agents/agent-create-dialog.tsx` | When `requireApprovalForAgents` is true, submit creates an Approval instead of an Agent. Show "Pending Approval" state. |
| `src/components/agents/agent-detail-client.tsx` | Add budget gauge to stats row. Show active budget policies and incidents. |
| `src/components/stories/story-detail-modal.tsx` | Add goal picker dropdown in story detail sidebar |
| `src/components/board/kanban-board.tsx` | Show goal badge on story cards when a goal is linked |

### 3.6 Notification Integration

Budget warnings and approval state changes create Notification records:

- `BUDGET_WARNING` -- soft threshold hit (80% default)
- `BUDGET_EXCEEDED` -- hard stop triggered
- `APPROVAL_REQUESTED` -- new approval needs decision
- `APPROVAL_DECIDED` -- approval was approved/rejected

These use the existing Notification model and are delivered via the existing notification system (in-app + optional email digest).

---

## 4. Budget Enforcement Flow

### 4.1 Core Function: `checkBudget()`

Location: `src/lib/budget-check.ts`

```typescript
export interface BudgetCheckResult {
  allowed: boolean;
  warnings: string[];
  blockedByPolicyId?: string;
}

export async function checkBudget(params: {
  orgId: string;
  agentId?: string;
  projectId?: string;
}): Promise<BudgetCheckResult>
```

Logic:

1. Load all BudgetPolicy records where:
   - `orgId` matches AND
   - `scope = "org"` OR
   - (`scope = "agent"` AND `scopeId = agentId`) OR
   - (`scope = "project"` AND `scopeId = projectId`)

2. For each policy, compute current spend:
   - `window = "calendar_month"`: SUM `CostEvent.costCents` WHERE `createdAt >= first-of-month` AND scope filter matches
   - `window = "lifetime"`: SUM `CostEvent.costCents` WHERE scope filter matches (no date bound)

3. For each policy:
   - If spend >= `amountCents` AND `hardStopEnabled`: return `{ allowed: false, blockedByPolicyId }`
   - If spend >= `amountCents * warnPercent / 100` AND `notifyEnabled`: add to warnings array
   - If spend >= `amountCents` AND NOT `hardStopEnabled`: add to warnings array (soft overage)

4. Create BudgetIncident records for any new threshold crossings (deduplicate: do not create if an unresolved incident of the same type exists for the same policy)

5. If a hard stop fires: auto-create an Approval of type `budget_override` so the user can grant a temporary increase

### 4.2 Scope Filtering for Spend Aggregation

```
scope = "org":      WHERE orgId = policy.orgId
scope = "agent":    WHERE agentId = policy.scopeId
scope = "project":  WHERE projectId = policy.scopeId
```

All filters always include `orgId` for safety (multi-tenant isolation).

### 4.3 Sequence Diagram: Budget Enforcement

```
User/Queue -> agent-trigger.ts: processNextStory(projectId)
  |
  |-> findNextStory(projectId)
  |   returns story
  |
  |-> checkBudget({ orgId, agentId, projectId })
  |   |
  |   |-> Load BudgetPolicy records (org + agent + project scopes)
  |   |-> For each policy:
  |   |     SUM CostEvent.costCents in window
  |   |     Compare to amountCents and warnPercent
  |   |
  |   |   [spend >= limit AND hardStopEnabled]
  |   |   |-> Create BudgetIncident (type: "hard_stop")
  |   |   |-> Create Approval (type: "budget_override")
  |   |   |-> Create Notification (type: "BUDGET_EXCEEDED") for OWNER/ADMIN
  |   |   |-> Return { allowed: false }
  |   |
  |   |   [spend >= warnPercent AND notifyEnabled]
  |   |   |-> Create BudgetIncident (type: "soft_warning") if not already open
  |   |   |-> Create Notification (type: "BUDGET_WARNING") for OWNER/ADMIN
  |   |   |-> Add to warnings[]
  |   |
  |   |   [spend < warnPercent]
  |   |   |-> No action
  |   |
  |   |-> Return { allowed: true/false, warnings }
  |
  |   [allowed = false]
  |   |-> Log "budget exceeded, agent blocked"
  |   |-> Return (do not spawn)
  |
  |   [allowed = true]
  |   |-> spawnAgent({ storyId, projectId, agentId })
  |   |   ... (existing flow)
```

### 4.4 Integration Point: agent-trigger.ts

Insert `checkBudget()` call in `processNextStory()` after finding the story and idle agent, but BEFORE calling `spawnAgent()`:

```typescript
// In processNextStory(), after selecting idleAgentId:

const budgetResult = await checkBudget({
  orgId: proj.orgId,
  agentId: idleAgentId,
  projectId,
});

if (!budgetResult.allowed) {
  console.log(`[agent-trigger] processNextStory: blocked by budget policy ${budgetResult.blockedByPolicyId}`);
  return;
}

if (budgetResult.warnings.length > 0) {
  console.log(`[agent-trigger] budget warnings: ${budgetResult.warnings.join(", ")}`);
}

// Proceed to spawnAgent...
```

Similarly, insert into `triggerClaudeAgent()` for manual triggers.

### 4.5 Integration Point: cost-tracking.ts

After recording a CostEvent in `recordCostEvent()`, trigger a lightweight budget check to detect threshold crossings in real-time (not just at spawn time):

```typescript
// At the end of recordCostEvent(), fire-and-forget:
checkBudgetAfterCost({ orgId: params.orgId, agentId: params.agentId, projectId: params.projectId })
  .catch(console.error);
```

This secondary check (`checkBudgetAfterCost`) only creates incidents and notifications -- it does NOT stop the currently running agent (that would require process termination, which is a Phase 3 concern). It ensures the next invocation is blocked.

---

## 5. Approval Lifecycle Flow

### 5.1 Approval Types and Payloads

#### Type: `hire_agent`

Created when `Organization.requireApprovalForAgents = true` and a user attempts to create an agent.

Payload:
```typescript
{
  agentName: string;
  agentRole: string;
  agentTitle?: string;
  agentAdapterType: string;
  agentCapabilities?: string;
  agentAdapterConfig?: Record<string, unknown>;
}
```

On approval: create the Agent record using the stored payload, set status to "idle".
On rejection: no action, the approval stays as a record.

#### Type: `budget_override`

Auto-created when a budget hard stop fires.

Payload:
```typescript
{
  policyId: string;
  incidentId: string;
  currentSpendCents: number;
  limitCents: number;
  requestedOverrideCents: number; // suggested: 120% of current limit
  scope: string;
  scopeId?: string;
}
```

On approval: temporarily increase the policy's `amountCents` to `requestedOverrideCents`, mark the BudgetIncident as resolved (set `resolvedAt`, `approvalId`). The policy reverts at the next window boundary (enforced by a cron check or manual reset).
On rejection: the BudgetIncident stays unresolved; agent remains blocked until spend resets at the next window boundary.

### 5.2 Sequence Diagram: Agent Hire with Approval

```
User -> agent-create-dialog: fill form, click "Create Agent"
  |
  |-> POST /api/orgs/[orgId]/agents
  |   |
  |   |-> Check org.requireApprovalForAgents
  |   |
  |   |   [requireApprovalForAgents = true]
  |   |   |-> Create Approval record:
  |   |   |     type: "hire_agent"
  |   |   |     status: "pending"
  |   |   |     payload: { agentName, agentRole, ... }
  |   |   |-> Create Notification for OWNER/ADMIN:
  |   |   |     "New agent hire request: {agentName}"
  |   |   |-> Return 202 { approval: { id, status: "pending" } }
  |   |
  |   |   [requireApprovalForAgents = false]
  |   |   |-> Create Agent record directly
  |   |   |-> Return 201 { agent: { ... } }
  |
  |   ... later ...
  |
OWNER -> approval-detail: review + click "Approve"
  |
  |-> PATCH /api/orgs/[orgId]/approvals/[id] { status: "approved" }
  |   |
  |   |-> Validate decidedBy has OWNER or ADMIN role
  |   |-> Set decidedById, decidedAt, status
  |   |
  |   |   [type = "hire_agent"]
  |   |   |-> Create Agent from approval.payload
  |   |   |-> Create Notification for requestedBy:
  |   |   |     "Your agent '{name}' was approved and created"
  |   |   |-> Return 200 { approval, agent }
```

### 5.3 Permission Model

| Action | Required Role |
|--------|---------------|
| Create approval (hire_agent) | MEMBER, ADMIN, or OWNER |
| View approvals in own org | MEMBER, ADMIN, or OWNER |
| Decide on approvals (approve/reject) | ADMIN or OWNER |
| Add comments to approvals | MEMBER, ADMIN, or OWNER |

New permissions to add to `src/lib/permissions.ts`:

```typescript
"approval:create"   // MEMBER, ADMIN, OWNER
"approval:decide"   // ADMIN, OWNER
"approval:read"     // MEMBER, ADMIN, OWNER
```

---

## 6. Goal Hierarchy Design

### 6.1 Hierarchy Structure

Goals form a tree with three levels:

```
Company Goal (level: "company")
  |
  +-- Team Goal (level: "team")
  |     |
  |     +-- Project Goal (level: "project")
  |     |     |
  |     |     +-- Story (via goalId FK)
  |     |     +-- Story
  |     |
  |     +-- Project Goal
  |
  +-- Team Goal
```

Constraints:
- A company goal can only have team or project children
- A team goal can only have project children
- A project goal cannot have children (leaf node)
- Maximum depth: 3 levels (enforced at API validation, not DB constraint)
- Self-referential cycles prevented by walking the parent chain on create/update (same pattern as Agent hierarchy in Phase 1, max depth 10)

### 6.2 Progress Calculation

Goal progress is computed at query time (not stored):

```typescript
function computeGoalProgress(goal: GoalWithStories): number {
  const stories = goal.stories;
  if (stories.length === 0) return 0;
  const done = stories.filter((s) => s.status === "DONE").length;
  return Math.round((done / stories.length) * 100);
}
```

For parent goals, progress is the average of children's progress (recursive). This is computed in the API response, not stored, to avoid stale data.

### 6.3 Agent Prompt Enhancement

When a story has a `goalId`, the agent prompt in `agent-executor.ts` includes the goal context:

```typescript
// In spawnAgent(), after loading story:
if (story.goalId) {
  const goal = await prisma.goal.findUnique({
    where: { id: story.goalId },
    select: { title: true, description: true, level: true },
  });
  if (goal) {
    promptParts.push(
      `\nGoal Context (${goal.level} level): "${goal.title}"`,
      goal.description ? `Goal Description: ${goal.description}` : "",
      `\nEnsure your implementation aligns with and contributes to this goal.`,
    );
  }
}
```

### 6.4 Goal Tree API Response

`GET /api/orgs/[orgId]/goals/tree` returns:

```typescript
{
  goals: Array<{
    id: string;
    title: string;
    description: string | null;
    level: string;
    status: string;
    progress: number; // 0-100, computed
    storyCount: number;
    ownerAgentId: string | null;
    children: Array</* recursive same shape */>;
  }>;
}
```

The tree is built by loading all goals for the org, then assembling into a tree in application code (not recursive DB queries). Since goal counts are bounded (typically < 100 per org), this is efficient.

---

## 7. Integration with Existing Agent Executor

### 7.1 Changes to `agent-trigger.ts`

```typescript
// processNextStory() -- add budget check:
import { checkBudget } from "@/lib/budget-check";

// After line: let idleAgentId: string | undefined;
// After selecting idle agent:

if (proj?.orgId) {
  const budget = await checkBudget({
    orgId: proj.orgId,
    agentId: idleAgentId,
    projectId,
  });
  if (!budget.allowed) {
    console.log(`[agent-trigger] blocked by budget: ${budget.blockedByPolicyId}`);
    return;
  }
}
```

```typescript
// triggerClaudeAgent() -- add budget check before spawn:
// After story existence check, before spawnAgent():

const proj = await prisma.project.findUnique({
  where: { id: projectId },
  select: { orgId: true },
});

if (proj?.orgId) {
  const budget = await checkBudget({
    orgId: proj.orgId,
    agentId,
    projectId,
  });
  if (!budget.allowed) {
    return { triggered: false, reason: "Budget limit exceeded. An approval request has been created for budget override." };
  }
}
```

### 7.2 Changes to `agent-executor.ts`

Add goal context injection in `spawnAgent()`:

```typescript
// After building promptParts (line ~270), before the "Instructions" section:

if (story.goalId) {
  const goal = await prisma.goal.findUnique({
    where: { id: story.goalId },
    select: { title: true, description: true, level: true },
  });
  if (goal) {
    promptParts.push(
      `\nGoal Context (${goal.level} level): "${goal.title}"`,
      goal.description ? `Goal Description: ${goal.description}` : "",
      `Ensure your implementation aligns with this goal.`,
    );
  }
}
```

### 7.3 Changes to `cost-tracking.ts`

Add post-recording budget check:

```typescript
// At the end of recordCostEvent(), add:
import { checkBudgetAfterCost } from "@/lib/budget-check";

// After the $transaction:
checkBudgetAfterCost({
  orgId: params.orgId,
  agentId: params.agentId,
  projectId: params.projectId,
}).catch(console.error);
```

### 7.4 Changes to `plan-limits.ts`

The existing `checkAgentLimit()` function is extended to check for pending approvals:

```typescript
export async function checkAgentLimit(orgId: string): Promise<LimitResult> {
  // ... existing plan limit check ...

  // Check if org requires approval for agents
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { requireApprovalForAgents: true },
  });

  if (org?.requireApprovalForAgents) {
    return {
      allowed: false,
      message: "Agent creation requires approval. Your request will be reviewed by an admin.",
      requiresApproval: true, // new field
    };
  }

  return { allowed: true };
}
```

Note: The existing `LimitResult` type is extended:

```typescript
type LimitResult =
  | { allowed: true }
  | { allowed: false; message: string; requiresApproval?: boolean };
```

### 7.5 Changes to `permissions.ts`

Add new permissions:

```typescript
export type Permission =
  | "org:delete"
  | "org:billing"
  | "org:settings"
  | "org:members"
  | "approval:create"   // NEW
  | "approval:decide"   // NEW
  | "approval:read"     // NEW
  | "budget:manage"     // NEW
  | "goal:manage"       // NEW
  | "project:create"
  // ... existing ...
  ;

const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  OWNER: new Set([
    // ... existing ...
    "approval:create",
    "approval:decide",
    "approval:read",
    "budget:manage",
    "goal:manage",
  ]),
  ADMIN: new Set([
    // ... existing ...
    "approval:create",
    "approval:decide",
    "approval:read",
    "budget:manage",
    "goal:manage",
  ]),
  MEMBER: new Set([
    // ... existing ...
    "approval:create",
    "approval:read",
  ]),
};
```

---

## 8. File List

### New Files

| File | Purpose |
|------|---------|
| **Library** | |
| `src/lib/budget-check.ts` | `checkBudget()`, `checkBudgetAfterCost()` functions |
| `src/lib/validations/budget-policy.ts` | Zod schemas for budget policy CRUD |
| `src/lib/validations/approval.ts` | Zod schemas for approval CRUD |
| `src/lib/validations/goal.ts` | Zod schemas for goal CRUD |
| **API Routes -- Budget** | |
| `src/app/api/orgs/[orgId]/budget-policies/route.ts` | GET (list) + POST (create) |
| `src/app/api/orgs/[orgId]/budget-policies/[policyId]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/orgs/[orgId]/budget-policies/[policyId]/incidents/route.ts` | GET incidents |
| `src/app/api/orgs/[orgId]/budget-status/route.ts` | GET current spend vs limits |
| **API Routes -- Approvals** | |
| `src/app/api/orgs/[orgId]/approvals/route.ts` | GET (list) + POST (create) |
| `src/app/api/orgs/[orgId]/approvals/[approvalId]/route.ts` | GET + PATCH (decide) |
| `src/app/api/orgs/[orgId]/approvals/[approvalId]/comments/route.ts` | POST comment |
| **API Routes -- Goals** | |
| `src/app/api/orgs/[orgId]/goals/route.ts` | GET (list) + POST (create) |
| `src/app/api/orgs/[orgId]/goals/[goalId]/route.ts` | GET + PATCH + DELETE |
| `src/app/api/orgs/[orgId]/goals/tree/route.ts` | GET tree view |
| **Pages** | |
| `src/app/(dashboard)/orgs/[orgId]/budget/page.tsx` | Budget policies page |
| `src/app/(dashboard)/orgs/[orgId]/approvals/page.tsx` | Approval queue page |
| `src/app/(dashboard)/orgs/[orgId]/approvals/[approvalId]/page.tsx` | Approval detail page |
| `src/app/(dashboard)/orgs/[orgId]/goals/page.tsx` | Goals tree page |
| **Components -- Budget** | |
| `src/components/budget/budget-policy-list.tsx` | Policy list with spend bars |
| `src/components/budget/budget-policy-form.tsx` | Create/edit policy dialog |
| `src/components/budget/budget-gauge.tsx` | Spend gauge visualization |
| `src/components/budget/budget-incident-list.tsx` | Incident list |
| `src/components/budget/budget-banner.tsx` | Warning/error banner |
| **Components -- Approvals** | |
| `src/components/approvals/approval-list.tsx` | Filterable approval list |
| `src/components/approvals/approval-card.tsx` | Single approval card |
| `src/components/approvals/approval-detail.tsx` | Full detail view |
| `src/components/approvals/approval-actions.tsx` | Decision buttons |
| `src/components/approvals/approval-badge.tsx` | Status badge |
| `src/components/approvals/approval-comment-list.tsx` | Comment thread |
| **Components -- Goals** | |
| `src/components/goals/goal-tree.tsx` | Hierarchical tree view |
| `src/components/goals/goal-card.tsx` | Single goal card |
| `src/components/goals/goal-form.tsx` | Create/edit dialog |
| `src/components/goals/goal-picker.tsx` | Dropdown for story assignment |
| `src/components/goals/goal-progress.tsx` | Progress indicator |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add BudgetPolicy, BudgetIncident, Approval, ApprovalComment, Goal models. Modify Organization, Story, User. |
| `src/lib/agent-trigger.ts` | Add `checkBudget()` call before `spawnAgent()` in both `processNextStory()` and `triggerClaudeAgent()` |
| `src/lib/agent-executor.ts` | Add goal context injection to agent prompt in `spawnAgent()` |
| `src/lib/cost-tracking.ts` | Add post-recording budget check call |
| `src/lib/plan-limits.ts` | Extend `checkAgentLimit()` with approval gate; extend `LimitResult` type |
| `src/lib/permissions.ts` | Add `approval:create`, `approval:decide`, `approval:read`, `budget:manage`, `goal:manage` permissions |
| `src/types/index.ts` | Add BudgetPolicy, Approval, Goal type exports and related types |
| `src/components/layout/sidebar.tsx` | Add Budget, Approvals, Goals links to org-level navigation |
| `src/components/agents/agent-create-dialog.tsx` | Redirect to approval flow when `requireApprovalForAgents` is true |
| `src/components/agents/agent-detail-client.tsx` | Add budget gauge to stats row |
| `src/components/stories/story-detail-modal.tsx` | Add goal picker dropdown |
| `src/components/board/kanban-board.tsx` | Show goal badge on story cards |
| `src/app/api/orgs/[orgId]/route.ts` | Allow updating `requireApprovalForAgents` |
| `src/app/api/orgs/[orgId]/agents/route.ts` | Intercept POST to create Approval when `requireApprovalForAgents` is true |
| `src/app/api/projects/[projectId]/stories/[storyId]/route.ts` | Accept `goalId` in PATCH body |
| `prisma/seed.ts` | Add sample budget policies, goals, and an approval to demo org |

---

## 9. Implementation Order

### Step 1: Schema + Migrations (Day 1)

1. Add all five new models to `prisma/schema.prisma` (BudgetPolicy, BudgetIncident, Approval, ApprovalComment, Goal)
2. Add `requireApprovalForAgents` to Organization
3. Add `goalId` to Story
4. Add approval relations to User
5. Run `npx prisma db push` and `npx prisma generate`
6. Create Zod validation schemas: `budget-policy.ts`, `approval.ts`, `goal.ts`
7. Update `src/types/index.ts` with new type exports
8. Update `src/lib/permissions.ts` with new permissions
9. Write tests for validation schemas

### Step 2: Budget Policies + Enforcement (Day 2-3)

1. Create `src/lib/budget-check.ts` with `checkBudget()` and `checkBudgetAfterCost()`
2. Create budget policy API routes (CRUD + status)
3. Integrate `checkBudget()` into `agent-trigger.ts` (both `processNextStory` and `triggerClaudeAgent`)
4. Integrate `checkBudgetAfterCost()` into `cost-tracking.ts`
5. Write tests for budget check logic (threshold calculations, incident dedup)
6. Create budget UI components (policy-list, policy-form, gauge, banner)
7. Create budget page
8. Write API tests for budget routes

### Step 3: Approval Workflow (Day 4-5)

1. Create approval API routes (CRUD + comments)
2. Implement approval resolution logic (hire_agent creates Agent, budget_override adjusts policy)
3. Extend `agent-create-dialog.tsx` with approval gate
4. Extend `checkAgentLimit()` in `plan-limits.ts` with approval requirement
5. Modify `POST /api/orgs/[orgId]/agents` to create Approval when required
6. Create approval UI components (list, card, detail, actions, badge, comments)
7. Create approval pages
8. Write tests for approval lifecycle (create, decide, side effects)
9. Wire notification creation for approval events

### Step 4: Goal Alignment (Day 6-7)

1. Create goal API routes (CRUD + tree)
2. Implement goal hierarchy validation (cycle prevention, level constraints)
3. Add goal context injection to `agent-executor.ts`
4. Extend story PATCH API to accept `goalId`
5. Create goal UI components (tree, card, form, picker, progress)
6. Create goals page
7. Add goal picker to story detail modal
8. Add goal badge to kanban board cards
9. Write tests for goal tree building, progress calculation, cycle prevention

### Step 5: Integration + Polish (Day 8)

1. Add sidebar navigation links (Budget, Approvals, Goals)
2. Add budget gauge to agent detail page
3. Update seed data with sample budget policies, goals, and approvals
4. End-to-end testing: create budget policy, trigger agent, verify enforcement
5. End-to-end testing: enable approval requirement, create agent, approve, verify activation
6. End-to-end testing: create goal tree, link stories, verify agent prompt includes goal context
7. Verify build succeeds (`npm run build`)
8. Run full test suite (`npm test`)

---

## 10. Risks and Mitigations

### Risk 1: Budget Check Performance

**Problem:** `checkBudget()` runs a SUM aggregation on CostEvent for every agent invocation. High-volume projects could make this slow.

**Mitigation:** The `@@index([projectId, createdAt])` and `@@index([agentId, createdAt])` indexes on CostEvent support efficient range scans. For calendar_month windows, the date filter bounds the scan. If performance becomes an issue, add a materialized monthly rollup table in Phase 3 (SUM by org/agent/project per month, updated by a cron or trigger).

### Risk 2: Budget Check Race Condition

**Problem:** Two concurrent `processNextStory()` calls could both pass the budget check before either spawns an agent.

**Mitigation:** This is acceptable because the budget check is a soft guard, not a transactional lock. The worst case is one extra agent invocation slightly over budget. The post-recording check in `cost-tracking.ts` will catch the overage and block subsequent invocations. For strict enforcement, a Serializable transaction wrapping checkBudget + claimAgentSlot could be added in Phase 3.

### Risk 3: Approval Stale Payloads

**Problem:** An agent hire approval's payload could reference stale data by the time it is approved (e.g., plan limits changed).

**Mitigation:** On approval resolution, re-validate the payload against current constraints (plan limits, agent count). If validation fails, the approval is auto-rejected with a system message explaining why.

### Risk 4: Goal Hierarchy Cycles

**Problem:** A goal could be set as its own parent or create a circular chain.

**Mitigation:** On create/update, walk the parent chain from the target `parentId` up to the root (max 10 iterations). If the current goal's ID appears in the chain, reject with 422. This is the same pattern used for Agent hierarchy cycle prevention in Phase 1.

### Risk 5: Budget Override Window Reset

**Problem:** When a budget override approval increases `amountCents`, there is no mechanism to automatically reset it at the next window boundary.

**Mitigation:** Store the original `amountCents` in the BudgetIncident's `approvalId` payload. A daily cron (`/api/cron/budget-reset`) checks for policies that were overridden and resets them if the window has rolled over. The override is temporary by design.

### Risk 6: Notification Volume

**Problem:** Budget warnings could generate excessive notifications if spend oscillates around the threshold.

**Mitigation:** BudgetIncident deduplication prevents repeated incidents for the same policy and type until the existing incident is resolved. Notifications are only created when a new incident is created, not on every check.
