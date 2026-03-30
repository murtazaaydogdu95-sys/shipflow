# Phase 3: Scheduling & Multi-Provider -- Architecture Document

## Overview

Phase 3 introduces three capabilities: **Multi-Provider Adapters** (pluggable AI backends beyond Claude), **Heartbeat Runs** (scheduled agent health checks and autonomous wake-ups), and **Advanced Routines** (templated, trigger-driven story creation with concurrency control). These features build on the Phase 1 Agent model and Phase 2 budget/approval infrastructure, replacing the hardcoded Claude spawn logic with an extensible adapter pattern and adding time-based automation on top of the existing queue system.

---

## 1. Prisma Schema Changes

### 1.1 Agent Model Additions

Add heartbeat scheduling fields to the existing `Agent` model:

```prisma
model Agent {
  // ... existing fields ...

  heartbeatInterval  Int?       // minutes between heartbeats (null = on-demand only)
  heartbeatCron      String?    // cron expression (overrides interval if set)
  nextHeartbeatAt    DateTime?  // computed next wake time
  heartbeatPrompt    String?    // custom prompt for heartbeat runs (null = default triage prompt)

  heartbeatRuns      HeartbeatRun[]
  routines           Routine[]

  // ... existing relations ...
}
```

Indexes to add:

```prisma
@@index([nextHeartbeatAt])  // cron job query: WHERE nextHeartbeatAt <= now()
```

### 1.2 New Model: HeartbeatRun

```prisma
model HeartbeatRun {
  id            String    @id @default(cuid())
  agentId       String
  agent         Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  storyId       String?
  story         Story?    @relation(fields: [storyId], references: [id], onDelete: SetNull)
  source        String    // "on_demand", "scheduled", "issue_assignment"
  status        String    @default("queued") // queued, running, succeeded, failed, timed_out, cancelled
  startedAt     DateTime?
  finishedAt    DateTime?
  exitCode      Int?
  inputTokens   Int?
  outputTokens  Int?
  costCents     Int?
  error         String?
  metadata      Json?
  createdAt     DateTime  @default(now())

  @@index([agentId, createdAt])
  @@index([agentId, status])
  @@index([storyId])
}
```

Add the reverse relation to `Story`:

```prisma
model Story {
  // ... existing fields ...
  heartbeatRuns  HeartbeatRun[]
}
```

### 1.3 New Model: Routine

```prisma
model Routine {
  id                String           @id @default(cuid())
  projectId         String
  project           Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  agentId           String?
  agent             Agent?           @relation(fields: [agentId], references: [id], onDelete: SetNull)
  name              String
  description       String?
  storyTemplate     Json             // { title, description, type, priority, storyPoints, labels }
  active            Boolean          @default(true)
  concurrencyPolicy String           @default("skip_if_active")
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  triggers          RoutineTrigger[]
  runs              RoutineRun[]

  @@unique([projectId, name])
  @@index([projectId])
  @@index([agentId])
}
```

Concurrency policy values:
- `always_enqueue` -- always create a new story, even if a previous routine run is still active
- `skip_if_active` -- skip if the routine has a RoutineRun with status `running` or `pending`
- `coalesce_if_active` -- if a pending run exists, do nothing; if a running run exists, mark a single pending run for after it finishes

### 1.4 New Model: RoutineTrigger

```prisma
model RoutineTrigger {
  id              String    @id @default(cuid())
  routineId       String
  routine         Routine   @relation(fields: [routineId], references: [id], onDelete: Cascade)
  type            String    // "cron", "webhook"
  cronExpression  String?   // e.g. "0 9 * * 1-5" (9am weekdays)
  cronTimezone    String?   // e.g. "Europe/Amsterdam"
  webhookSecret   String?   // HMAC-SHA256 secret for webhook auth (encrypted at rest)
  active          Boolean   @default(true)
  lastFiredAt     DateTime?
  nextFireAt      DateTime?
  createdAt       DateTime  @default(now())

  @@index([routineId])
  @@index([type, active, nextFireAt])  // cron job query
}
```

### 1.5 New Model: RoutineRun

```prisma
model RoutineRun {
  id          String    @id @default(cuid())
  routineId   String
  routine     Routine   @relation(fields: [routineId], references: [id], onDelete: Cascade)
  triggerId   String?
  storyId     String?   // the created story, if any
  status      String    @default("pending") // pending, running, completed, failed, skipped
  startedAt   DateTime?
  finishedAt  DateTime?
  error       String?
  createdAt   DateTime  @default(now())

  @@index([routineId, status])
  @@index([routineId, createdAt])
}
```

### 1.6 Project Model Additions

Add the reverse relation for routines to `Project`:

```prisma
model Project {
  // ... existing fields ...
  routines  Routine[]
}
```

---

## 2. Multi-Provider Adapter System

### 2.1 Interface Definitions

File: `src/lib/adapters/types.ts`

```typescript
export interface AgentExecutionContext {
  agent: {
    id: string;
    name: string;
    adapterType: string;
    adapterConfig: unknown;
  };
  story: {
    id: string;
    shortId: string;
    title: string;
    description: string | null;
    userStory: string | null;
    type: string;
    priority: string;
    acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
  };
  project: {
    id: string;
    apiKey: string;
    agentWorkingDir: string;
    aiProvider: string;
    aiApiKey: string | null;
  };
  prompt: string;
  workingDir: string;
  mcpConfigPath: string;
  branchName: string;
  feedback?: string;
  onComplete?: (projectId: string) => void;
}

export interface AgentExecutionResult {
  success: boolean;
  exitCode?: number;
  outputTokens?: number;
  inputTokens?: number;
  costCents?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterConfig {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export interface AgentAdapter {
  readonly type: string;
  spawn(context: AgentExecutionContext): Promise<AgentExecutionResult>;
  parseConfig(config: unknown): AdapterConfig;
  estimateCost(model: string, inputTokens: number, outputTokens: number): number;
  validateConfig(config: AdapterConfig): { valid: boolean; errors: string[] };
}
```

### 2.2 Adapter Registry

File: `src/lib/adapters/registry.ts`

```typescript
import type { AgentAdapter } from "./types";

const adapters = new Map<string, AgentAdapter>();

export function registerAdapter(adapter: AgentAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function getAdapter(type: string): AgentAdapter {
  const adapter = adapters.get(type);
  if (!adapter) {
    throw new Error(`Unknown adapter type: "${type}". Registered: ${[...adapters.keys()].join(", ")}`);
  }
  return adapter;
}

export function listAdapters(): string[] {
  return [...adapters.keys()];
}
```

Adapters are registered at module load time via a barrel file `src/lib/adapters/index.ts` that imports all implementations and calls `registerAdapter()`.

### 2.3 ClaudeAdapter

File: `src/lib/adapters/claude-adapter.ts`

Refactors the existing `spawnAgent()` logic from `agent-executor.ts`. The spawn behavior stays identical: detached child process running the `claude` CLI with `--print --dangerously-skip-permissions --mcp-config`. Key changes:

- Extracts all Claude-specific logic (binary resolution, PATH construction, CLI args) into `ClaudeAdapter.spawn()`
- The exit handler logic (preview start, AI review trigger, agent status reset) remains in `agent-executor.ts` as shared post-execution hooks
- `estimateCost()` uses the existing `MODEL_PRICING` table from `cost-tracking.ts`
- `parseConfig()` accepts `{ model?: string }` (future: temperature, max_tokens)

```typescript
class ClaudeAdapter implements AgentAdapter {
  readonly type = "claude";

  spawn(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // Returns a promise that resolves when the detached process exits
    // Uses getClaudeBin(), builds PATH, spawns with --print flag
    // Writes to /tmp/codepylot-agent-{storyId}.log
  }

  parseConfig(config: unknown): AdapterConfig {
    // Validates and returns { model?: string }
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    return calculateCostCents(model, inputTokens, outputTokens);
  }

  validateConfig(config: AdapterConfig): { valid: boolean; errors: string[] } {
    // Claude adapter requires no API key (uses CLI auth)
    // Validates model name against known Claude models
  }
}
```

### 2.4 OpenAIAdapter

File: `src/lib/adapters/openai-adapter.ts`

Uses the OpenAI Chat Completions API with function calling. Does NOT spawn a child process; instead makes HTTP requests directly.

```typescript
class OpenAIAdapter implements AgentAdapter {
  readonly type = "openai";

  async spawn(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // 1. Build messages array from context.prompt
    // 2. Define MCP tools as OpenAI function definitions
    // 3. Loop: call chat completions, handle function calls, until done or max iterations
    // 4. Return token counts from usage response
  }

  parseConfig(config: unknown): AdapterConfig {
    // Required: apiKey (or from project.aiApiKey)
    // Optional: model (default "gpt-4o"), baseUrl, maxTokens
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Uses MODEL_PRICING from cost-tracking.ts (gpt-4o, gpt-4o-mini entries exist)
  }

  validateConfig(config: AdapterConfig): { valid: boolean; errors: string[] } {
    // Requires apiKey
  }
}
```

MCP tool bridging: The OpenAI adapter translates MCP tools (update_story_status, complete_story, add_note, etc.) into OpenAI function definitions. When the model calls a function, the adapter makes an HTTP request to the CodePylot API using the project API key, exactly as the MCP server would.

### 2.5 OllamaAdapter

File: `src/lib/adapters/ollama-adapter.ts`

Uses the Ollama HTTP API (compatible with OpenAI chat format). For local/self-hosted models.

```typescript
class OllamaAdapter implements AgentAdapter {
  readonly type = "ollama";

  async spawn(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // 1. POST to {baseUrl}/api/chat with model, messages, tools
    // 2. Handle streaming response for tool calls
    // 3. Ollama does not report token usage reliably; estimate from prompt length
  }

  parseConfig(config: unknown): AdapterConfig {
    // Optional: baseUrl (default from OLLAMA_URL env or "http://localhost:11434")
    // Optional: model (default "llama3.1")
  }

  estimateCost(): number {
    return 0; // Local models have no API cost
  }

  validateConfig(config: AdapterConfig): { valid: boolean; errors: string[] } {
    // Validates baseUrl is a valid URL
  }
}
```

### 2.6 HttpAdapter

File: `src/lib/adapters/http-adapter.ts`

Generic adapter that POSTs the prompt to an external URL. Supports two modes:
1. **Synchronous**: POST prompt, await JSON response with result
2. **Webhook callback**: POST prompt with a callback URL, the external service calls back when done

```typescript
class HttpAdapter implements AgentAdapter {
  readonly type = "http";

  async spawn(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    // 1. POST { prompt, storyId, projectId, metadata } to config.baseUrl
    // 2. Include HMAC signature header for auth
    // 3. If config.callbackMode:
    //    - Return immediately with { success: true } placeholder
    //    - External service calls POST /api/projects/{id}/agents/callback
    // 4. If sync mode: await response, parse { success, tokens, error }
  }

  parseConfig(config: unknown): AdapterConfig {
    // Required: baseUrl
    // Optional: apiKey (for Authorization header), callbackMode (boolean)
  }

  estimateCost(): number {
    return 0; // External provider; cost tracked via callback metadata
  }

  validateConfig(config: AdapterConfig): { valid: boolean; errors: string[] } {
    // Requires baseUrl, validates with isPublicUrl() for SSRF prevention
  }
}
```

### 2.7 Adapter Selection in spawnAgent()

The refactored `spawnAgent()` in `agent-executor.ts` becomes adapter-aware:

```typescript
export async function spawnAgent(options: SpawnOptions) {
  // ... existing setup (load project, story, claim slot, ensure branch) ...

  // Resolve adapter
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  const adapterType = agent?.adapterType ?? "claude";
  const adapter = getAdapter(adapterType);
  const adapterConfig = adapter.parseConfig(agent?.adapterConfig);

  // Build context
  const context: AgentExecutionContext = {
    agent: { id: agent.id, name: agent.name, adapterType, adapterConfig },
    story: { /* ... */ },
    project: { /* ... */ },
    prompt,
    workingDir: project.agentWorkingDir,
    mcpConfigPath: configPath,
    branchName,
    feedback,
    onComplete,
  };

  // Execute via adapter
  const result = await adapter.spawn(context);

  // Record cost event if tokens reported
  if (result.inputTokens || result.outputTokens) {
    await recordCostEvent({
      agentId: agent.id,
      storyId,
      projectId,
      orgId: project.orgId,
      provider: adapterType,
      model: adapterConfig.model ?? "unknown",
      inputTokens: result.inputTokens ?? 0,
      outputTokens: result.outputTokens ?? 0,
    });
  }

  // ... existing post-execution hooks (preview, review, status reset) ...
}
```

Important: The `ClaudeAdapter` continues to use the detached-process pattern (spawn returns a Promise that resolves on process exit). The `OpenAIAdapter` and `OllamaAdapter` use async HTTP loops (the Promise resolves when the conversation completes). The `HttpAdapter` in callback mode resolves immediately. This asymmetry is intentional -- the adapter interface abstracts it away.

---

## 3. Heartbeat System

### 3.1 Concept

A "heartbeat" is a scheduled agent invocation that is not tied to a specific story. It allows agents to autonomously:
- Triage the backlog and pick up work
- Run maintenance tasks (dependency updates, linting)
- Report status to the team
- Execute custom prompts defined by the org

Each heartbeat creates a `HeartbeatRun` record for observability.

### 3.2 Scheduling Logic

File: `src/lib/heartbeat-scheduler.ts`

```typescript
export async function computeNextHeartbeat(agent: {
  heartbeatInterval: number | null;
  heartbeatCron: string | null;
}): Date | null {
  if (agent.heartbeatCron) {
    // Parse cron expression, return next occurrence after now
    // Uses a lightweight cron parser (cron-parser npm package)
    return cronParser.parseExpression(agent.heartbeatCron).next().toDate();
  }
  if (agent.heartbeatInterval) {
    return new Date(Date.now() + agent.heartbeatInterval * 60 * 1000);
  }
  return null; // On-demand only
}

export async function findDueHeartbeats(): Promise<Agent[]> {
  return prisma.agent.findMany({
    where: {
      status: { not: "terminated" },
      nextHeartbeatAt: { lte: new Date() },
      // Don't fire if agent is already running
      NOT: { status: "running" },
    },
    include: { org: { select: { id: true, plan: true } } },
  });
}

export async function executeHeartbeat(agent: Agent): Promise<HeartbeatRun> {
  // 1. Create HeartbeatRun record with status "queued"
  const run = await prisma.heartbeatRun.create({
    data: {
      agentId: agent.id,
      source: "scheduled",
      status: "queued",
    },
  });

  // 2. Budget check
  const budgetResult = await checkBudget(agent.id, /* projectId */ "", agent.orgId);
  if (!budgetResult.allowed) {
    return prisma.heartbeatRun.update({
      where: { id: run.id },
      data: { status: "failed", error: budgetResult.reason, finishedAt: new Date() },
    });
  }

  // 3. Build heartbeat prompt
  const prompt = agent.heartbeatPrompt ?? buildDefaultHeartbeatPrompt(agent);

  // 4. Resolve adapter and execute
  const adapter = getAdapter(agent.adapterType);
  await prisma.heartbeatRun.update({
    where: { id: run.id },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    const result = await adapter.spawn(heartbeatContext);
    return prisma.heartbeatRun.update({
      where: { id: run.id },
      data: {
        status: result.success ? "succeeded" : "failed",
        exitCode: result.exitCode,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costCents: result.costCents,
        error: result.error,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    return prisma.heartbeatRun.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
  }

  // 5. Compute and set next heartbeat time
  const nextAt = await computeNextHeartbeat(agent);
  await prisma.agent.update({
    where: { id: agent.id },
    data: { nextHeartbeatAt: nextAt, lastHeartbeatAt: new Date() },
  });
}
```

### 3.3 Default Heartbeat Prompt

```typescript
function buildDefaultHeartbeatPrompt(agent: Agent): string {
  return [
    `You are agent "${agent.name}" (role: ${agent.role}).`,
    `This is a scheduled heartbeat. Check the project backlog for stories that need attention.`,
    ``,
    `Instructions:`,
    `1. Call list_stories to see available work`,
    `2. If there are stories in TODO or BACKLOG matching your role, call get_next_story`,
    `3. If there is nothing to do, call add_note with a brief status update`,
    `4. Do NOT create new stories -- only pick up existing ones`,
  ].join("\n");
}
```

### 3.4 Timeout Handling

The existing `agent-cleanup` cron (runs every 15 min) is extended to also handle heartbeat timeouts:

```typescript
// In /api/cron/agent-cleanup:
// Find HeartbeatRuns stuck in "running" past AGENT_TIMEOUT_MS
const timedOut = await prisma.heartbeatRun.updateMany({
  where: {
    status: "running",
    startedAt: { lte: new Date(Date.now() - AGENT_TIMEOUT_MS) },
  },
  data: { status: "timed_out", finishedAt: new Date() },
});
```

---

## 4. Advanced Routines

### 4.1 Concept

A Routine is a templated workflow that creates stories from a template when a trigger fires. Unlike `RecurringStory` (which only creates stories on a fixed schedule), Routines support:
- Cron expressions with timezone awareness
- Webhook triggers (external events create stories)
- Agent assignment (auto-assign the created story to a specific agent)
- Concurrency policies (prevent duplicate work)

Routines subsume the existing `RecurringStory` model. Migration path: a one-time script converts `RecurringStory` records into `Routine` + `RoutineTrigger` records.

### 4.2 Story Template Schema

Validated with Zod at the API boundary:

```typescript
const storyTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["feature", "bug", "chore", "refactor", "docs", "test"]).default("chore"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  storyPoints: z.number().int().min(1).max(21).optional(),
  labels: z.array(z.string()).optional(), // label names, resolved to IDs at creation time
});
```

The title supports template variables:
- `{{date}}` -- replaced with ISO date (e.g. "2026-03-30")
- `{{weekday}}` -- replaced with day name (e.g. "Monday")
- `{{counter}}` -- replaced with the routine's total run count

### 4.3 Cron Trigger Execution

File: `src/lib/routine-scheduler.ts`

```typescript
export async function findDueRoutineTriggers(): Promise<RoutineTrigger[]> {
  return prisma.routineTrigger.findMany({
    where: {
      type: "cron",
      active: true,
      nextFireAt: { lte: new Date() },
      routine: { active: true },
    },
    include: {
      routine: {
        include: { project: { select: { id: true, orgId: true } } },
      },
    },
  });
}

export async function fireRoutineTrigger(trigger: RoutineTrigger): Promise<RoutineRun> {
  const routine = trigger.routine;

  // 1. Concurrency policy check
  if (routine.concurrencyPolicy !== "always_enqueue") {
    const activeRun = await prisma.routineRun.findFirst({
      where: {
        routineId: routine.id,
        status: { in: ["pending", "running"] },
      },
    });

    if (activeRun) {
      if (routine.concurrencyPolicy === "skip_if_active") {
        return prisma.routineRun.create({
          data: {
            routineId: routine.id,
            triggerId: trigger.id,
            status: "skipped",
            finishedAt: new Date(),
          },
        });
      }
      if (routine.concurrencyPolicy === "coalesce_if_active" && activeRun.status === "pending") {
        // Already coalesced -- skip
        return prisma.routineRun.create({
          data: {
            routineId: routine.id,
            triggerId: trigger.id,
            status: "skipped",
            finishedAt: new Date(),
          },
        });
      }
      // coalesce_if_active with running: create a pending run (will be picked up later)
    }
  }

  // 2. Create RoutineRun
  const run = await prisma.routineRun.create({
    data: {
      routineId: routine.id,
      triggerId: trigger.id,
      status: "pending",
      startedAt: new Date(),
    },
  });

  // 3. Create story from template
  try {
    const template = routine.storyTemplate as StoryTemplate;
    const title = interpolateTemplate(template.title);

    const story = await createStoryFromTemplate({
      projectId: routine.projectId,
      template: { ...template, title },
      agentId: routine.agentId,
    });

    await prisma.routineRun.update({
      where: { id: run.id },
      data: { storyId: story.id, status: "running" },
    });

    // 4. If agent is assigned, trigger agent execution
    if (routine.agentId) {
      await processNextStory(routine.projectId);
    }

    return prisma.routineRun.update({
      where: { id: run.id },
      data: { status: "completed", finishedAt: new Date() },
    });
  } catch (err) {
    return prisma.routineRun.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
  }

  // 5. Update trigger's nextFireAt
  const nextAt = computeNextCronFire(trigger.cronExpression, trigger.cronTimezone);
  await prisma.routineTrigger.update({
    where: { id: trigger.id },
    data: { lastFiredAt: new Date(), nextFireAt: nextAt },
  });
}
```

### 4.4 Webhook Trigger Endpoint

Route: `POST /api/projects/[projectId]/routines/[routineId]/webhook`

```typescript
export async function POST(req: Request, { params }) {
  const { projectId, routineId } = params;

  // 1. Load routine + trigger
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, projectId, active: true },
    include: {
      triggers: { where: { type: "webhook", active: true } },
    },
  });
  if (!routine || routine.triggers.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Verify HMAC signature
  const trigger = routine.triggers[0];
  const signature = req.headers.get("x-webhook-signature");
  const body = await req.text();
  const secret = decrypt(trigger.webhookSecret);
  const expected = hmacSha256(secret, body);
  if (!signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Fire the trigger
  const run = await fireRoutineTrigger(trigger);
  return NextResponse.json({ runId: run.id, status: run.status });
}
```

### 4.5 RecurringStory Migration

A migration script converts existing `RecurringStory` records:

```typescript
// prisma/migrate-recurring-to-routines.ts
for (const rs of recurringStories) {
  const cronExpression = frequencyToCron(rs.frequency, rs.dayOfWeek, rs.dayOfMonth);
  await prisma.routine.create({
    data: {
      projectId: rs.projectId,
      name: `Recurring: ${rs.title}`,
      storyTemplate: {
        title: rs.title,
        description: rs.description,
        type: rs.type,
        priority: rs.priority,
        storyPoints: rs.storyPoints,
      },
      active: rs.active,
      triggers: {
        create: {
          type: "cron",
          cronExpression,
          active: rs.active,
          lastFiredAt: rs.lastCreatedAt,
          nextFireAt: computeNextCronFire(cronExpression),
        },
      },
    },
  });
}
```

Where `frequencyToCron` maps:
- `daily` -> `"0 6 * * *"` (6am UTC, matching existing cron schedule)
- `weekly` (dayOfWeek=1) -> `"0 6 * * 1"`
- `monthly` (dayOfMonth=15) -> `"0 6 15 * *"`

---

## 5. Cron Job Redesign

### 5.1 Current State

| Job | Schedule | Route |
|-----|----------|-------|
| agent-cleanup | Every 15 min | `/api/cron/agent-cleanup` |
| webhook-retry | Every 5 min | `/api/cron/webhook-retry` |
| recurring | Daily 6am | `/api/cron/recurring` |
| digest | Daily 8am | `/api/cron/digest` |

### 5.2 Proposed Consolidation

Add one new cron job and modify one existing job:

| Job | Schedule | Route | Changes |
|-----|----------|-------|---------|
| agent-cleanup | Every 15 min | `/api/cron/agent-cleanup` | Add HeartbeatRun timeout handling |
| webhook-retry | Every 5 min | `/api/cron/webhook-retry` | No change |
| **scheduler** | **Every 1 min** | **`/api/cron/scheduler`** | **NEW: heartbeats + routine triggers** |
| recurring | Daily 6am | `/api/cron/recurring` | **Deprecated after migration; keep for backward compat** |
| digest | Daily 8am | `/api/cron/digest` | No change |

### 5.3 Scheduler Cron

Route: `POST /api/cron/scheduler`

```typescript
export async function POST(req: Request) {
  // Auth: same pattern as existing crons (Bearer token or Vercel cron header)

  const results = { heartbeats: 0, routines: 0 };

  // 1. Process due heartbeats
  const dueAgents = await findDueHeartbeats();
  for (const agent of dueAgents) {
    try {
      await executeHeartbeat(agent);
      results.heartbeats++;
    } catch (err) {
      console.error(`[scheduler] heartbeat failed for agent ${agent.id}:`, sanitizeError(err));
    }
  }

  // 2. Process due routine triggers
  const dueTriggers = await findDueRoutineTriggers();
  for (const trigger of dueTriggers) {
    try {
      await fireRoutineTrigger(trigger);
      results.routines++;
    } catch (err) {
      console.error(`[scheduler] routine trigger failed for ${trigger.id}:`, sanitizeError(err));
    }
  }

  return NextResponse.json(results);
}
```

Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/scheduler", "schedule": "* * * * *" }
  ]
}
```

### 5.4 Rate Protection

The scheduler cron runs every minute. To prevent overlapping executions on slow runs:
- Each execution acquires a lightweight lock via a `SchedulerLock` row (upsert with `lockedUntil` timestamp)
- If the lock is held, the cron returns immediately with `{ skipped: true }`
- Lock TTL: 55 seconds (shorter than the 1-min interval)

This avoids needing a separate locking infrastructure (Redis, etc.) -- it uses the existing PostgreSQL database.

---

## 6. API Routes

### 6.1 Adapter Management

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/adapters` | List available adapter types |
| POST | `/api/adapters/validate` | Validate adapter config |

### 6.2 Agent Heartbeat

| Method | Route | Purpose |
|--------|-------|---------|
| PATCH | `/api/orgs/[orgId]/agents/[agentId]` | Update heartbeatInterval, heartbeatCron, heartbeatPrompt |
| GET | `/api/orgs/[orgId]/agents/[agentId]/heartbeats` | List HeartbeatRun records (paginated) |
| POST | `/api/orgs/[orgId]/agents/[agentId]/heartbeats` | Trigger on-demand heartbeat |

### 6.3 Routines CRUD

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/projects/[projectId]/routines` | List routines |
| POST | `/api/projects/[projectId]/routines` | Create routine |
| GET | `/api/projects/[projectId]/routines/[routineId]` | Get routine detail |
| PATCH | `/api/projects/[projectId]/routines/[routineId]` | Update routine |
| DELETE | `/api/projects/[projectId]/routines/[routineId]` | Delete routine |
| GET | `/api/projects/[projectId]/routines/[routineId]/runs` | List RoutineRun records |

### 6.4 Routine Triggers

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/projects/[projectId]/routines/[routineId]/triggers` | Add trigger |
| PATCH | `/api/projects/[projectId]/routines/[routineId]/triggers/[triggerId]` | Update trigger |
| DELETE | `/api/projects/[projectId]/routines/[routineId]/triggers/[triggerId]` | Remove trigger |
| POST | `/api/projects/[projectId]/routines/[routineId]/webhook` | Webhook trigger endpoint |

### 6.5 Agent Callback (for HttpAdapter)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/projects/[projectId]/agents/callback` | Receive async result from HttpAdapter |

All routes use `requireProjectAccess()` for auth (except the webhook endpoint which uses HMAC). All request bodies parsed with `parseJsonBody()` and validated with Zod schemas.

---

## 7. UI Components

### 7.1 Agent Settings Panel (extended)

Location: `src/components/agents/agent-settings-panel.tsx`

Add to existing agent settings:
- **Adapter type** dropdown (claude / openai / ollama / http)
- **Adapter config** JSON editor (contextual fields based on adapter type)
- **Heartbeat interval** number input (minutes) OR cron expression text input
- **Heartbeat prompt** textarea (optional custom prompt)
- **Next heartbeat** read-only display with manual trigger button

### 7.2 Heartbeat History

Location: `src/components/agents/heartbeat-history.tsx`

- Table of HeartbeatRun records: status badge, source, duration, cost, token counts
- Expandable rows showing error details and metadata
- Filter by status (succeeded / failed / timed_out)

### 7.3 Routines Management Page

Location: `src/app/(dashboard)/projects/[projectId]/routines/page.tsx`

- List view of all routines with active/inactive toggle
- Each row shows: name, agent (if assigned), trigger summary, last run status, next fire time
- Create/edit modal with:
  - Name, description
  - Story template form (title with variable hints, type, priority, points)
  - Concurrency policy selector
  - Agent assignment dropdown (optional)
  - Triggers section: add cron or webhook triggers
- Run history tab per routine

### 7.4 Routine Trigger Configuration

Location: `src/components/routines/trigger-config.tsx`

- **Cron trigger**: cron expression input with human-readable preview ("Every weekday at 9:00 AM"), timezone selector
- **Webhook trigger**: displays webhook URL + secret (copy button), regenerate secret button

### 7.5 Scheduler Dashboard Widget

Location: `src/components/dashboard/scheduler-widget.tsx`

- Compact widget showing upcoming scheduled events (heartbeats + routine fires) for the next 24 hours
- Timeline visualization using existing recharts dependency

---

## 8. File List

### New Files

| Path | Purpose |
|------|---------|
| `src/lib/adapters/types.ts` | AgentAdapter interface, context/result types |
| `src/lib/adapters/registry.ts` | Adapter registry (register, get, list) |
| `src/lib/adapters/index.ts` | Barrel: imports all adapters, registers them |
| `src/lib/adapters/claude-adapter.ts` | Claude CLI adapter (refactored from agent-executor.ts) |
| `src/lib/adapters/openai-adapter.ts` | OpenAI Chat Completions adapter |
| `src/lib/adapters/ollama-adapter.ts` | Ollama local API adapter |
| `src/lib/adapters/http-adapter.ts` | Generic HTTP/webhook adapter |
| `src/lib/heartbeat-scheduler.ts` | Heartbeat scheduling and execution logic |
| `src/lib/routine-scheduler.ts` | Routine trigger evaluation and story creation |
| `src/lib/cron-utils.ts` | Shared cron parsing utilities (wraps cron-parser) |
| `src/lib/validations/routine.ts` | Zod schemas for routine and trigger validation |
| `src/lib/validations/adapter.ts` | Zod schemas for adapter config validation |
| `src/app/api/cron/scheduler/route.ts` | Unified scheduler cron endpoint |
| `src/app/api/adapters/route.ts` | List available adapters |
| `src/app/api/adapters/validate/route.ts` | Validate adapter config |
| `src/app/api/orgs/[orgId]/agents/[agentId]/heartbeats/route.ts` | List + trigger heartbeats |
| `src/app/api/projects/[projectId]/routines/route.ts` | Routine CRUD (list + create) |
| `src/app/api/projects/[projectId]/routines/[routineId]/route.ts` | Routine detail (get + patch + delete) |
| `src/app/api/projects/[projectId]/routines/[routineId]/runs/route.ts` | Routine run history |
| `src/app/api/projects/[projectId]/routines/[routineId]/triggers/route.ts` | Trigger CRUD |
| `src/app/api/projects/[projectId]/routines/[routineId]/triggers/[triggerId]/route.ts` | Trigger update + delete |
| `src/app/api/projects/[projectId]/routines/[routineId]/webhook/route.ts` | Webhook trigger endpoint |
| `src/app/api/projects/[projectId]/agents/callback/route.ts` | HttpAdapter callback endpoint |
| `src/components/agents/agent-settings-panel.tsx` | Extended agent settings (adapter + heartbeat) |
| `src/components/agents/heartbeat-history.tsx` | HeartbeatRun list/detail |
| `src/app/(dashboard)/projects/[projectId]/routines/page.tsx` | Routines management page |
| `src/components/routines/routine-form.tsx` | Create/edit routine modal |
| `src/components/routines/trigger-config.tsx` | Trigger configuration UI |
| `src/components/routines/run-history.tsx` | Routine run history table |
| `src/components/dashboard/scheduler-widget.tsx` | Upcoming events widget |
| `prisma/migrate-recurring-to-routines.ts` | Migration script for RecurringStory -> Routine |
| `tests/lib/adapters/claude-adapter.test.ts` | ClaudeAdapter unit tests |
| `tests/lib/adapters/openai-adapter.test.ts` | OpenAIAdapter unit tests |
| `tests/lib/adapters/ollama-adapter.test.ts` | OllamaAdapter unit tests |
| `tests/lib/adapters/http-adapter.test.ts` | HttpAdapter unit tests |
| `tests/lib/adapters/registry.test.ts` | Registry unit tests |
| `tests/lib/heartbeat-scheduler.test.ts` | Heartbeat scheduling tests |
| `tests/lib/routine-scheduler.test.ts` | Routine scheduling tests |
| `tests/api/routines.test.ts` | Routine API integration tests |
| `tests/api/heartbeats.test.ts` | Heartbeat API integration tests |

### Modified Files

| Path | Changes |
|------|---------|
| `prisma/schema.prisma` | Add HeartbeatRun, Routine, RoutineTrigger, RoutineRun models; extend Agent with heartbeat fields; add relations to Story, Project |
| `src/lib/agent-executor.ts` | Refactor: extract Claude-specific spawn into ClaudeAdapter; use adapter registry for dispatch; keep shared pre/post hooks |
| `src/lib/agent-trigger.ts` | Minor: pass adapter context through to spawnAgent |
| `src/lib/cost-tracking.ts` | Export MODEL_PRICING for adapter use; no logic changes |
| `src/app/api/cron/agent-cleanup/route.ts` | Add HeartbeatRun timeout handling |
| `vercel.json` | Add scheduler cron entry |

---

## 9. Implementation Order

### Step 1: Adapter Interface + ClaudeAdapter (no behavior change)

1. Create `src/lib/adapters/types.ts`, `registry.ts`, `index.ts`
2. Create `claude-adapter.ts` by extracting logic from `agent-executor.ts`
3. Refactor `agent-executor.ts` to use `getAdapter("claude").spawn()`
4. Write tests for ClaudeAdapter and registry
5. Verify all existing agent tests still pass (regression gate)

This step is a pure refactor -- no new features, no schema changes, no new dependencies.

### Step 2: Schema + Heartbeat System

1. Add new models to `prisma/schema.prisma` (HeartbeatRun, Agent heartbeat fields)
2. Run `npx prisma db push`
3. Implement `heartbeat-scheduler.ts`
4. Create `/api/cron/scheduler` route (heartbeat portion only)
5. Extend `/api/cron/agent-cleanup` for HeartbeatRun timeouts
6. Create heartbeat API routes
7. Write tests
8. Add to `vercel.json`

### Step 3: OpenAI + Ollama Adapters

1. Implement `openai-adapter.ts` with MCP-to-function-call bridging
2. Implement `ollama-adapter.ts`
3. Write tests (mock HTTP responses)
4. Add adapter config UI to agent settings panel

### Step 4: Routine System

1. Add Routine, RoutineTrigger, RoutineRun models to schema
2. Run `npx prisma db push`
3. Implement `routine-scheduler.ts`
4. Extend `/api/cron/scheduler` to process routine triggers
5. Create routine API routes (CRUD + webhook)
6. Create Zod validation schemas
7. Write tests
8. Build routine management UI

### Step 5: HttpAdapter + Callback

1. Implement `http-adapter.ts`
2. Create `/api/projects/[projectId]/agents/callback` endpoint
3. Write tests

### Step 6: RecurringStory Migration

1. Create migration script
2. Test migration on seed data
3. Deprecate `/api/cron/recurring` (keep working but log deprecation)
4. Update UI to redirect RecurringStory management to Routines

---

## 10. Risks and Mitigations

### R1: Scheduler Cron Reliability (Vercel)

**Risk**: Vercel cron jobs have a minimum interval of 1 minute and may skip executions under load.

**Mitigation**: The scheduler is idempotent -- if it misses a tick, the next tick picks up all due items via `nextFireAt <= now()`. No events are lost, only delayed. For sub-minute precision needs, document that self-hosted deployments should use an external scheduler (e.g. cron on the host, or a dedicated worker process).

### R2: OpenAI Adapter Tool Bridging Complexity

**Risk**: Translating MCP tools to OpenAI function calling introduces a maintenance surface. MCP tools may change independently.

**Mitigation**: Define a shared `ToolDefinition` type that both the MCP server and OpenAI adapter consume. Generate OpenAI function schemas from the same source as MCP tool definitions. Add a test that asserts parity between MCP tools and adapter function definitions.

### R3: HttpAdapter SSRF

**Risk**: The HttpAdapter POSTs to user-configured URLs, creating an SSRF vector.

**Mitigation**: Reuse the existing `isPublicUrl()` from `src/lib/webhooks.ts` which validates URLs against private IP ranges. Validate at both config-save time and execution time (DNS rebinding prevention, same as webhook deliveries).

### R4: Heartbeat Cost Runaway

**Risk**: An agent with a 1-minute heartbeat interval and an expensive model could accumulate significant cost before budget policies react.

**Mitigation**: Heartbeat execution calls `checkBudget()` before every invocation. Additionally, enforce a minimum heartbeat interval of 5 minutes at the API validation layer. The budget hard-stop mechanism will pause the agent if the threshold is crossed.

### R5: Routine Concurrency Race Conditions

**Risk**: Two scheduler ticks could evaluate the same trigger simultaneously, creating duplicate stories.

**Mitigation**: Use a Serializable transaction when checking concurrency policy and creating the RoutineRun. Update `nextFireAt` atomically in the same transaction. The scheduler lock (Section 5.4) prevents overlapping scheduler executions entirely on single-instance deployments.

### R6: Adapter Config Secret Leakage

**Risk**: `adapterConfig` on the Agent model may contain API keys (e.g. OpenAI key) stored in plain JSON.

**Mitigation**: The `adapterConfig` field should encrypt sensitive values using the existing `encrypt()` from `src/lib/encryption.ts`. Each adapter's `parseConfig()` calls `decrypt()` on known secret fields. The API response for agent detail must strip secrets (return masked values like `sk-...xxxx`).

### R7: Migration Disruption (RecurringStory)

**Risk**: Converting RecurringStory to Routine could cause missed story creation if the migration runs between cron ticks.

**Mitigation**: Run migration during a maintenance window. The migration script sets `nextFireAt` on the new triggers to match the expected next fire time. Keep the old `/api/cron/recurring` endpoint operational (it becomes a no-op once all RecurringStory records are inactive). Add a feature flag `ROUTINES_ENABLED` that must be set before the scheduler processes routine triggers.
