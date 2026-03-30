# Phase 1: Agent Foundation -- Architecture Document

## 1. Schema Changes

### 1.1 New Model: Agent

```prisma
model Agent {
  id               String    @id @default(cuid())
  projectId        String
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name             String    // e.g. "Frontend Coder"
  role             String    // e.g. "coder", "reviewer", "qa"
  title            String?   // e.g. "Senior Frontend Developer"
  icon             String?   // emoji or icon key (e.g. "bot", "shield", "code")
  status           String    @default("idle") // idle, running, paused, terminated
  capabilities     String?   // freeform text: "React, TypeScript, testing"
  adapterType      String    @default("claude") // claude, codex, cursor, gemini, http, process
  adapterConfig    Json?     // provider-specific: { model, temperature, maxTokens, systemPrompt }
  reportsTo        String?
  reportingAgent   Agent?    @relation("AgentHierarchy", fields: [reportsTo], references: [id], onDelete: SetNull)
  subordinates     Agent[]   @relation("AgentHierarchy")
  pauseReason      String?   // manual, budget, system
  lastHeartbeatAt  DateTime?
  storiesCompleted Int       @default(0)
  totalCostCents   Int       @default(0)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  assignedStories Story[]    @relation("AgentAssignedStories")
  costEvents      CostEvent[]

  @@index([projectId])
  @@index([projectId, status])
}
```

### 1.2 New Model: CostEvent

```prisma
model CostEvent {
  id           String   @id @default(cuid())
  agentId      String?
  agent        Agent?   @relation(fields: [agentId], references: [id], onDelete: SetNull)
  storyId      String?
  story        Story?   @relation(fields: [storyId], references: [id], onDelete: SetNull)
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  provider     String   // anthropic, openai, google
  model        String   // claude-sonnet-4-20250514, gpt-4o, etc.
  inputTokens  Int
  outputTokens Int
  costCents    Int      // cost in integer cents (e.g. 12 = $0.12)
  metadata     Json?    // { requestId, endpoint, duration_ms, ... }
  createdAt    DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([agentId, createdAt])
  @@index([storyId])
}
```

### 1.3 Modified Model: Story

Add a nullable `agentId` foreign key. The existing `assignedToAgent` boolean is retained for backward compatibility during migration but becomes derived from `agentId IS NOT NULL`.

```prisma
model Story {
  // ... existing fields ...
  agentId            String?
  agent              Agent?   @relation("AgentAssignedStories", fields: [agentId], references: [id], onDelete: SetNull)
  identifier         String?  @unique  // e.g. "CP-42"
  costEvents         CostEvent[]

  // existing field kept temporarily:
  // assignedToAgent  Boolean  @default(false)  -- deprecated, derive from agentId != null
}
```

New indexes on Story:

```prisma
  @@index([agentId])
```

### 1.4 Modified Model: Organization

Add issue numbering fields:

```prisma
model Organization {
  // ... existing fields ...
  issuePrefix   String?   // e.g. "CP", derived from org name on creation
  issueCounter  Int       @default(0) // atomically incremented per story
}
```

### 1.5 Modified Model: Project

Add relations for the new models:

```prisma
model Project {
  // ... existing fields ...
  agents      Agent[]
  costEvents  CostEvent[]
}
```

### 1.6 Complete Prisma Additions (copy-paste ready)

```prisma
// Add to schema.prisma after existing models:

model Agent {
  id               String    @id @default(cuid())
  projectId        String
  project          Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name             String
  role             String
  title            String?
  icon             String?
  status           String    @default("idle")
  capabilities     String?
  adapterType      String    @default("claude")
  adapterConfig    Json?
  reportsTo        String?
  reportingAgent   Agent?    @relation("AgentHierarchy", fields: [reportsTo], references: [id], onDelete: SetNull)
  subordinates     Agent[]   @relation("AgentHierarchy")
  pauseReason      String?
  lastHeartbeatAt  DateTime?
  storiesCompleted Int       @default(0)
  totalCostCents   Int       @default(0)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  assignedStories Story[]    @relation("AgentAssignedStories")
  costEvents      CostEvent[]

  @@index([projectId])
  @@index([projectId, status])
}

model CostEvent {
  id           String   @id @default(cuid())
  agentId      String?
  agent        Agent?   @relation(fields: [agentId], references: [id], onDelete: SetNull)
  storyId      String?
  story        Story?   @relation(fields: [storyId], references: [id], onDelete: SetNull)
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  provider     String
  model        String
  inputTokens  Int
  outputTokens Int
  costCents    Int
  metadata     Json?
  createdAt    DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([agentId, createdAt])
  @@index([storyId])
}
```

---

## 2. API Routes

### 2.1 Agent CRUD

All routes require `requireProjectAccess()` and parse bodies with `parseJsonBody()`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/[projectId]/agents` | List all agents for a project |
| POST | `/api/projects/[projectId]/agents` | Create a new agent (validate against plan limits) |
| GET | `/api/projects/[projectId]/agents/[agentId]` | Get agent detail with stats |
| PATCH | `/api/projects/[projectId]/agents/[agentId]` | Update agent config/name/role |
| DELETE | `/api/projects/[projectId]/agents/[agentId]` | Delete agent (must be idle) |
| POST | `/api/projects/[projectId]/agents/[agentId]/pause` | Pause agent (set status=paused, pauseReason) |
| POST | `/api/projects/[projectId]/agents/[agentId]/resume` | Resume agent (set status=idle) |

#### POST /api/projects/[projectId]/agents -- Request Body

```typescript
{
  name: string;           // required, max 100 chars
  role: string;           // required, one of: coder, reviewer, qa, devops, designer
  title?: string;         // optional, max 200 chars
  icon?: string;          // optional, emoji or icon key
  capabilities?: string;  // optional, freeform text
  adapterType?: string;   // optional, default "claude"
  adapterConfig?: {       // optional, provider-specific
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  reportsTo?: string;     // optional, agent ID
}
```

#### Validation (Zod schema in `src/lib/validations/agent.ts`)

```typescript
import { z } from "zod";

export const AGENT_ROLES = ["coder", "reviewer", "qa", "devops", "designer"] as const;
export const ADAPTER_TYPES = ["claude", "codex", "cursor", "gemini", "http", "process"] as const;
export const AGENT_STATUSES = ["idle", "running", "paused", "terminated"] as const;

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(AGENT_ROLES),
  title: z.string().max(200).optional(),
  icon: z.string().max(20).optional(),
  capabilities: z.string().max(1000).optional(),
  adapterType: z.enum(ADAPTER_TYPES).default("claude"),
  adapterConfig: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    systemPrompt: z.string().max(5000).optional(),
  }).optional(),
  reportsTo: z.string().cuid().optional(),
});

export const updateAgentSchema = createAgentSchema.partial();
```

### 2.2 Cost Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/[projectId]/costs` | List cost events with pagination + filters |
| GET | `/api/projects/[projectId]/costs/summary` | Aggregated cost summary (by agent, by model, by day) |

#### GET /api/projects/[projectId]/costs -- Query Parameters

- `agentId` -- filter by agent
- `storyId` -- filter by story
- `provider` -- filter by provider
- `from` / `to` -- date range (ISO 8601)
- `cursor` -- cursor-based pagination
- `limit` -- page size, default 50, max 200

#### GET /api/projects/[projectId]/costs/summary -- Response

```typescript
{
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byAgent: Array<{ agentId: string; agentName: string; costCents: number }>;
  byModel: Array<{ model: string; costCents: number; tokenCount: number }>;
  byDay: Array<{ date: string; costCents: number }>;
  period: { from: string; to: string };
}
```

### 2.3 Issue Numbering

No dedicated API routes needed. Issue numbering is handled internally:

- On story creation, atomically increment `Organization.issueCounter` using `$transaction` and assign `Story.identifier` as `${org.issuePrefix}-${newCounter}`.
- The identifier is returned in all existing story endpoints.

### 2.4 Org Settings Extension

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/orgs/[orgId]` (existing) | Add `issuePrefix` to updatable fields |

---

## 3. Components

### 3.1 New Pages

| File | Description |
|------|-------------|
| `src/app/(dashboard)/projects/[projectId]/agents/page.tsx` | Agent list page (server component, fetches agents) |
| `src/app/(dashboard)/projects/[projectId]/agents/[agentId]/page.tsx` | Agent detail page (stats, assigned stories, cost history) |

### 3.2 New Components

| File | Description |
|------|-------------|
| `src/components/agents/agent-list.tsx` | Client component: grid/list of agent cards with status badges |
| `src/components/agents/agent-card.tsx` | Single agent card: icon, name, role, status badge, story count |
| `src/components/agents/agent-create-dialog.tsx` | Dialog for creating/editing an agent (form with Zod validation) |
| `src/components/agents/agent-detail-panel.tsx` | Detail view: config, stats, cost chart, assigned stories |
| `src/components/agents/agent-status-badge.tsx` | Reusable badge component for agent statuses (idle=gray, running=green, paused=yellow, terminated=red) |
| `src/components/agents/agent-adapter-config.tsx` | Form section for adapter-specific configuration |
| `src/components/agents/agent-cost-chart.tsx` | recharts area chart showing cost over time for an agent |

### 3.3 Modified Components

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Add "Agents" link with `Bot` icon to `projectLinks` array, positioned after "Analytics" and before "Settings" |
| `src/components/board/kanban-board.tsx` | Show `story.identifier` (e.g. "CP-42") instead of/alongside `shortId` on story cards |
| `src/components/stories/story-detail-modal.tsx` | Show assigned agent name+avatar instead of generic "Agent" label; show `identifier` in header |

### 3.4 Sidebar Change (Exact)

In `src/components/layout/sidebar.tsx`, add to the `projectLinks` array:

```typescript
{ href: `/projects/${projectId}/agents`, label: "Agents", icon: Bot },
```

Import `Bot` from `lucide-react`.

---

## 4. Migration Strategy

### 4.1 Schema Migration (Prisma db push)

Since the project uses `prisma db push` (not migrations), the process is:

1. Add the `Agent` and `CostEvent` models to `schema.prisma`
2. Add `agentId`, `identifier`, and `costEvents` to `Story`
3. Add `issuePrefix` and `issueCounter` to `Organization`
4. Add `agents` and `costEvents` relations to `Project`
5. Run `npx prisma db push`
6. Run `npx prisma generate`

### 4.2 Data Migration Script (`prisma/migrate-agents.ts`)

This script handles existing data:

```typescript
// 1. Backfill Organization.issuePrefix
//    - Derive from org name: take first 2-3 uppercase letters
//    - e.g. "Demo Workspace" -> "DW", "Acme Corp" -> "AC"

// 2. Backfill Organization.issueCounter
//    - Count existing stories across all org projects
//    - Set issueCounter = max story count across org

// 3. Backfill Story.identifier for existing stories
//    - For each org, enumerate stories ordered by createdAt
//    - Assign identifier = "{prefix}-{n}" where n starts at 1

// 4. Backfill Story.agentId
//    - Stories with assignedToAgent=true but no agentId:
//      leave agentId=null (no Agent record exists yet)
//    - The assignedToAgent boolean continues to work until
//      users create Agent records

// 5. Create default Agent records (optional, skip for now)
//    - Do NOT auto-create agents; users should declare them
```

### 4.3 Backward Compatibility

The `assignedToAgent` boolean field on Story is NOT removed in Phase 1. Instead:

- New code sets both `agentId` AND `assignedToAgent` when assigning an agent
- Existing code that reads `assignedToAgent` continues to work
- Phase 2 deprecation: remove `assignedToAgent`, replace all reads with `agentId != null`

---

## 5. Integration Points

### 5.1 agent-queue.ts Changes

**`resolveMaxAgents()`** -- No change needed. It already reads `maxConcurrentAgents` from the project and plan. The Agent model count is checked separately at creation time (not at runtime slot claiming).

**`claimAgentSlot(storyId, projectId)` -> `claimAgentSlot(storyId, projectId, agentId?)`**

Add optional `agentId` parameter. When provided:
- Set `Story.agentId = agentId` in the transaction alongside the existing updates
- Update `Agent.status = "running"` and `Agent.lastHeartbeatAt = now()`

When not provided (backward compat), behavior is unchanged.

**`isQueueBlocked()`** -- No change. It counts stories with agentStatus RUNNING/QUEUED, which is independent of Agent records.

**`findNextStory()`** -- No change needed in Phase 1.

### 5.2 agent-executor.ts Changes

**`spawnAgent()` signature addition:**

```typescript
interface SpawnOptions {
  storyId: string;
  projectId: string;
  agentId?: string;      // NEW: which Agent record to use
  feedback?: string;
  onComplete?: (projectId: string) => void;
}
```

When `agentId` is provided:
1. Load the Agent record to get `adapterConfig`
2. Use `adapterConfig.model` to select the AI model (if the adapter supports it)
3. Use `adapterConfig.systemPrompt` as a preamble in the prompt
4. Pass `agentId` to `claimAgentSlot()`
5. On exit (success): increment `Agent.storiesCompleted` and set `Agent.status = "idle"`
6. On exit (failure): set `Agent.status = "idle"` (not "terminated" -- that is manual only)

### 5.3 agent-trigger.ts Changes

**`processNextStory()`** -- After finding the next story, select an idle agent:

```typescript
// After findNextStory() returns a story:
const idleAgent = await prisma.agent.findFirst({
  where: { projectId, status: "idle" },
  orderBy: { storiesCompleted: "asc" }, // round-robin by least work
});

// Pass agentId to spawnAgent if an Agent record exists
await spawnAgent({
  storyId: story.id,
  projectId,
  agentId: idleAgent?.id,
  onComplete: (pid) => processNextStory(pid).catch(console.error),
});
```

**`triggerClaudeAgent()`** -- Accept optional `agentId` in `TriggerOptions`:

```typescript
interface TriggerOptions {
  storyId: string;
  projectId: string;
  agentId?: string;  // NEW
  force?: boolean;
  feedback?: string;
}
```

### 5.4 plan-limits.ts Changes

Add a new limit check function:

```typescript
export async function checkAgentLimit(projectId: string): Promise<LimitResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  const plan = await resolvePlan(project?.orgId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  const count = await prisma.agent.count({
    where: { projectId, status: { not: "terminated" } },
  });

  if (count >= limits.maxConcurrentAgents) {
    return {
      allowed: false,
      message: `Your plan allows up to ${limits.maxConcurrentAgents} agents. Upgrade for more.`,
    };
  }

  return { allowed: true };
}
```

Note: `maxConcurrentAgents` from PLAN_LIMITS now serves double duty -- it caps both concurrent running agents AND total declared (non-terminated) agents per project. This is intentional: a FREE plan user cannot declare 5 agents even if only 1 runs at a time. The plan limit is the ceiling for declared agents.

### 5.5 Story Creation -- Issue Numbering

In the story creation API route (`src/app/api/projects/[projectId]/stories/route.ts`), wrap the story insert in a transaction that:

1. Looks up the project's org
2. Atomically increments `Organization.issueCounter` using `$transaction` with Serializable isolation
3. Computes `identifier = ${org.issuePrefix}-${newCounter}`
4. Creates the story with the `identifier` field set

```typescript
const story = await prisma.$transaction(async (tx) => {
  const project = await tx.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { orgId: true },
  });

  let identifier: string | undefined;
  if (project.orgId) {
    const org = await tx.organization.update({
      where: { id: project.orgId },
      data: { issueCounter: { increment: 1 } },
      select: { issuePrefix: true, issueCounter: true },
    });
    identifier = `${org.issuePrefix}-${org.issueCounter}`;
  }

  return tx.story.create({
    data: {
      ...storyData,
      identifier,
    },
  });
}, { isolationLevel: "Serializable" });
```

### 5.6 Cost Event Recording

Create a utility function in `src/lib/cost-tracking.ts`:

```typescript
export async function recordCostEvent(params: {
  projectId: string;
  agentId?: string;
  storyId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.$transaction([
    prisma.costEvent.create({ data: params }),
    // Update agent running total if agentId is present
    ...(params.agentId
      ? [
          prisma.agent.update({
            where: { id: params.agentId },
            data: { totalCostCents: { increment: params.costCents } },
          }),
        ]
      : []),
  ]);
}
```

This function is called from:
- The MCP server when it proxies AI requests (future integration)
- The AI rewrite endpoint after calling the Anthropic API
- The agent executor on completion (if token usage is available from Claude CLI output)

### 5.7 Types (src/types/index.ts)

Add new types:

```typescript
import type { Agent, CostEvent } from "@prisma/client";

export type AgentWithStats = Agent & {
  _count: { assignedStories: number; costEvents: number };
};

export type AgentDetail = Agent & {
  assignedStories: Pick<Story, "id" | "shortId" | "identifier" | "title" | "status">[];
  subordinates: Pick<Agent, "id" | "name" | "role" | "status">[];
  reportingAgent: Pick<Agent, "id" | "name" | "role"> | null;
};

export const AGENT_ROLES = ["coder", "reviewer", "qa", "devops", "designer"] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_STATUSES = ["idle", "running", "paused", "terminated"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const ADAPTER_TYPES = ["claude", "codex", "cursor", "gemini", "http", "process"] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];
```

---

## 6. File List

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/projects/[projectId]/agents/route.ts` | GET (list) + POST (create) agents |
| `src/app/api/projects/[projectId]/agents/[agentId]/route.ts` | GET + PATCH + DELETE single agent |
| `src/app/api/projects/[projectId]/agents/[agentId]/pause/route.ts` | POST pause agent |
| `src/app/api/projects/[projectId]/agents/[agentId]/resume/route.ts` | POST resume agent |
| `src/app/api/projects/[projectId]/costs/route.ts` | GET cost events |
| `src/app/api/projects/[projectId]/costs/summary/route.ts` | GET cost summary |
| `src/app/(dashboard)/projects/[projectId]/agents/page.tsx` | Agent list page |
| `src/app/(dashboard)/projects/[projectId]/agents/[agentId]/page.tsx` | Agent detail page |
| `src/components/agents/agent-list.tsx` | Agent list grid |
| `src/components/agents/agent-card.tsx` | Single agent card |
| `src/components/agents/agent-create-dialog.tsx` | Create/edit dialog |
| `src/components/agents/agent-detail-panel.tsx` | Detail view panel |
| `src/components/agents/agent-status-badge.tsx` | Status badge |
| `src/components/agents/agent-adapter-config.tsx` | Adapter config form |
| `src/components/agents/agent-cost-chart.tsx` | Cost chart (recharts) |
| `src/lib/validations/agent.ts` | Zod schemas for agent CRUD |
| `src/lib/cost-tracking.ts` | Cost event recording utility |
| `prisma/migrate-agents.ts` | Data migration script |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Agent, CostEvent models; modify Story, Organization, Project |
| `src/lib/agent-queue.ts` | Add `agentId` param to `claimAgentSlot` |
| `src/lib/agent-executor.ts` | Add `agentId` to SpawnOptions, load agent config, update agent status |
| `src/lib/agent-trigger.ts` | Select idle agent before spawning, pass `agentId` |
| `src/lib/plan-limits.ts` | Add `checkAgentLimit()` function |
| `src/types/index.ts` | Add AgentWithStats, AgentDetail, AgentRole, AgentStatus, AdapterType |
| `src/components/layout/sidebar.tsx` | Add "Agents" link to project nav |
| `src/components/board/kanban-board.tsx` | Display `story.identifier` on cards |
| `src/components/stories/story-detail-modal.tsx` | Show assigned agent name; show identifier |
| `src/app/api/projects/[projectId]/stories/route.ts` | Add issue numbering on story creation |
| `src/app/api/orgs/[orgId]/route.ts` | Allow updating `issuePrefix` |
| `prisma/seed.ts` | Add sample agents and issuePrefix to demo org |

---

## 7. Implementation Order

Build features in this order, each step shippable independently:

### Step 1: Schema + Migration (Day 1)

1. Add Agent, CostEvent models to `schema.prisma`
2. Add `agentId` and `identifier` to Story
3. Add `issuePrefix` and `issueCounter` to Organization
4. Run `npx prisma db push` and `npx prisma generate`
5. Write and run `prisma/migrate-agents.ts` for backfill
6. Update seed with sample agents and issuePrefix

### Step 2: Issue Numbering (Day 1-2)

1. Add `issuePrefix` default logic in org creation (auth.ts signup callback)
2. Add atomic counter increment in story creation route
3. Update story list/detail API responses to include `identifier`
4. Update board UI to show identifiers on cards
5. Write tests for the counter atomicity

### Step 3: Agent CRUD API (Day 2-3)

1. Create `src/lib/validations/agent.ts`
2. Create all agent API routes (list, create, get, update, delete, pause, resume)
3. Add `checkAgentLimit()` to plan-limits.ts
4. Write API tests for all endpoints

### Step 4: Agent UI (Day 3-4)

1. Create agent components (card, list, status badge, create dialog)
2. Create agent pages (list, detail)
3. Add sidebar navigation link
4. Wire up SWR data fetching

### Step 5: Agent-Executor Integration (Day 4-5)

1. Modify `claimAgentSlot` to accept and set `agentId`
2. Modify `spawnAgent` to load agent config and use adapter settings
3. Modify `processNextStory` to select an idle agent
4. Update agent status on spawn start/complete/error
5. Write integration tests

### Step 6: Cost Tracking (Day 5-6)

1. Create `src/lib/cost-tracking.ts`
2. Create cost API routes (list, summary)
3. Create cost chart component
4. Integrate cost recording into agent executor exit handler
5. Add cost display to agent detail page

---

## 8. Risks and Mitigations

### Risk 1: Issue Counter Race Condition

**Problem:** Two concurrent story creations could get the same issue number.

**Mitigation:** Use `Serializable` isolation level in the `$transaction` that increments `Organization.issueCounter`. Prisma's serializable transactions will fail and retry on conflict. This matches the existing pattern used in `claimAgentSlot()`.

### Risk 2: Agent Status Desync

**Problem:** The Agent's `status` field could become stale if the spawned process crashes without the exit handler running (e.g., OOM kill, server restart).

**Mitigation:** The existing `agent-cleanup` cron job (runs every 15 min) already marks RUNNING agents as FAILED after 30 minutes. Extend this to also reset `Agent.status` from "running" to "idle" for any agent whose last story's `agentStatus` is not RUNNING/QUEUED. Add `lastHeartbeatAt` checks: if `lastHeartbeatAt` is older than 35 minutes, force status to "idle".

### Risk 3: Plan Limit Bypass via API

**Problem:** A user could create more agents than their plan allows by sending concurrent POST requests.

**Mitigation:** Use a `Serializable` transaction in the agent creation endpoint that counts existing agents and creates the new one atomically (same pattern as `claimAgentSlot`).

### Risk 4: Backward Compatibility with assignedToAgent

**Problem:** Existing code (board queries, status checks, review gating) reads `assignedToAgent` boolean.

**Mitigation:** During Phase 1, set BOTH `agentId` AND `assignedToAgent = true` when assigning an agent. Do not remove `assignedToAgent` until Phase 2 when all consumers are migrated. The field is never false when `agentId` is set.

### Risk 5: Cost Data Accuracy

**Problem:** Claude CLI does not emit structured token usage data. Cost events may be incomplete.

**Mitigation:** Phase 1 cost tracking is "best effort." The `recordCostEvent` function is called when data is available (e.g., from the AI rewrite endpoint which uses the SDK directly). For CLI-spawned agents, costs are estimated from the log file output if parseable, or recorded as zero. Phase 2 will switch to SDK-based agent execution for accurate tracking.

### Risk 6: Adapter Abstraction Complexity

**Problem:** Supporting 6 adapter types in Phase 1 adds unnecessary complexity.

**Mitigation:** Phase 1 only implements the `claude` adapter. The `adapterType` field is stored but all other adapter types return a "not yet supported" error when used. The schema is forward-compatible for Phase 2+ when more adapters are implemented.

### Risk 7: Self-Referential Agent Hierarchy Cycles

**Problem:** An agent could report to itself or create circular hierarchies.

**Mitigation:** The `reportsTo` validation in the create/update endpoint must check for cycles. On update, walk the hierarchy up from the target `reportsTo` agent and verify the current agent's ID is not in the chain. Maximum depth check of 10 levels prevents infinite loops.

### Risk 8: Large Cost Event Tables

**Problem:** Cost events accumulate rapidly (potentially thousands per day per active project).

**Mitigation:** The `@@index([projectId, createdAt])` index supports efficient range queries. The API uses cursor-based pagination (not offset). For the summary endpoint, queries are bounded by date range (default: last 30 days). Phase 2 can add monthly rollup tables if needed.
