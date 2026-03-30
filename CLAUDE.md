# Claude Code Configuration — ShipFlow (CodePylot)

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Prisma v6 (prisma-client-js) + PostgreSQL (Supabase)
- **Auth**: NextAuth v5 beta (JWT sessions, GitHub/Google/Credentials providers)
- **Drag & Drop**: @dnd-kit for Kanban board
- **AI**: @anthropic-ai/sdk for story rewrite + agent code review
- **Multi-Provider Agents**: Claude CLI, OpenAI API, Ollama, HTTP webhook adapters
- **Data Fetching**: SWR for client data, server components for SSR
- **Charts**: recharts for analytics (velocity, burndown, cycle time)
- **Animations**: framer-motion
- **Notifications**: sonner (toasts), custom email templates
- **Scheduling**: cron-parser for routine/heartbeat cron expressions
- **MCP Server**: packages/mcp-server/ (agent communication)

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Ensure input validation at system boundaries with Zod schemas
- Use Prisma parameterized queries (never raw SQL except `$queryRaw` with `$1` placeholders)

### Core Flow (Idea → Code → Review → Deploy)

1. User creates a story (quick capture via Cmd+K or manual)
2. AI rewrites raw input into structured story (acceptance criteria, story points, priority)
3. Persistent agent picks up story (auto-assign via heartbeat or manual trigger)
4. Agent adapter (Claude/OpenAI/Ollama/HTTP) creates branch, writes code, calls MCP tools
5. Story moves to REVIEW when agent calls `complete_story`
6. **User must view the diff** before approval (server-side enforced via `reviewedAt`/`reviewedBy`)
7. Diff viewer shows risk indicators (secrets, eval, XSS, raw SQL, debug logging, env vars, TODOs)
8. User approves → code merges to main; or rejects with feedback → agent re-triggers
9. Agent learning: last 5 rejection patterns included in next agent prompt context
10. Goal context injected into agent prompts when story is linked to a goal

### Key Paths

- **Schema**: prisma/schema.prisma
- **Auth**: src/lib/auth.ts (NextAuth config, auto-creates org on signup)
- **Prisma singleton**: src/lib/prisma.ts
- **API auth**: src/lib/api-auth.ts (requireProjectAccess helper)
- **Permissions**: src/lib/permissions.ts (RBAC: OWNER/ADMIN/MEMBER)
- **Plan limits**: src/lib/plan-limits.ts (org-based limits)
- **AI rewrite**: src/lib/ai-rewrite.ts (system/user message separation)
- **Agent orchestration**: src/lib/agent-trigger.ts (orchestrator with budget gate)
- **Agent queue**: src/lib/agent-queue.ts (slot claiming, priority ordering, agent selection)
- **Agent executor**: src/lib/agent-executor.ts (adapter dispatch, branch management, workspace integration)
- **Adapter interface**: src/lib/adapters/types.ts (AgentAdapter, AdapterInvokeParams, AdapterResult)
- **Adapter registry**: src/lib/adapters/registry.ts (claude, openai, ollama, http)
- **Claude adapter**: src/lib/adapters/claude-adapter.ts (CLI spawn)
- **OpenAI adapter**: src/lib/adapters/openai-adapter.ts (API calls)
- **Ollama adapter**: src/lib/adapters/ollama-adapter.ts (local models)
- **HTTP adapter**: src/lib/adapters/http-adapter.ts (webhook with HMAC)
- **Budget enforcement**: src/lib/budget-check.ts (checkBudget, checkBudgetAfterCost)
- **Cost tracking**: src/lib/cost-tracking.ts (recordCostEvent, calculateCostCents)
- **Approvals**: src/lib/approvals.ts (createApproval, decideApproval, four-eyes principle)
- **Goals**: src/lib/goals.ts (calculateGoalProgress, detectGoalCycle, getGoalContext)
- **Routine engine**: src/lib/routine-engine.ts (cron evaluation, concurrency policies)
- **Read state**: src/lib/read-state.ts (markAsRead helper)
- **Webhooks**: src/lib/webhooks.ts (delivery with DLQ)
- **Encryption**: src/lib/encryption.ts (AES-256-GCM)
- **Rate limiting**: src/lib/rate-limit.ts (API, AI, auth limiters)
- **Board**: src/components/board/kanban-board.tsx
- **Board filters**: src/components/board/board-filters.tsx (search, priority, type, label, assignee, sprint, agent status)
- **Story modal**: src/components/stories/story-detail-modal.tsx (with sub-tasks, cost summary, goal selector)
- **Sub-tasks**: src/components/stories/sub-task-list.tsx
- **Diff viewer**: src/components/stories/diff-viewer.tsx (with risk detection)
- **Review panel**: src/components/stories/story-review-panel.tsx
- **Agent list**: src/components/agents/agent-list-client.tsx
- **Agent detail**: src/components/agents/agent-detail-client.tsx (Settings/Activity/Cost/Heartbeat/Workspaces tabs)
- **Org chart**: src/components/agents/org-chart.tsx (CSS tree with drag-to-rearrange)
- **Budget dashboard**: src/components/budget/budget-dashboard.tsx
- **Approval list**: src/components/approvals/approval-list.tsx
- **Goal tree**: src/components/goals/goal-tree.tsx
- **Routine list**: src/components/routines/routine-list.tsx
- **Inbox**: src/components/inbox/inbox-view.tsx
- **Analytics tabs**: src/components/analytics/analytics-tabs-client.tsx (Overview + Burndown)
- **Burndown chart**: src/components/analytics/burndown-tab.tsx
- **Public board**: src/app/board/[slug]/page.tsx

### Data Models (Prisma)

| Model | Purpose |
|-------|---------|
| User | Auth, profile, org membership |
| Organization | Multi-tenant container, billing, issue numbering (issuePrefix + issueCounter) |
| OrgMember | RBAC roles (OWNER/ADMIN/MEMBER) |
| Project | Project container, settings, agent working dir |
| ProjectMember | Project-level access |
| Story | Tasks/tickets with status lifecycle, sub-tasks (parentId), goal linking |
| Agent | Persistent agent entities with lifecycle, adapter config, org chart hierarchy (reportsTo) |
| CostEvent | Per-invocation token/cost tracking per agent/story/project |
| BudgetPolicy | Multi-scope budget rules (agent/project/org), auto-pause at threshold |
| BudgetIncident | Soft warning and hard stop event records |
| Approval | General-purpose approval workflow (hire_agent, budget_override) |
| ApprovalComment | Discussion threads on approvals |
| Goal | Hierarchical goals (company/team/project) linked to stories |
| HeartbeatRun | Agent invocation tracking (queued/running/succeeded/failed/timed_out) |
| Routine | Recurring task templates with cron + webhook triggers |
| RoutineRun | Routine execution history |
| ExecutionWorkspace | Agent working directory lifecycle management |
| ReadState | Per-user read tracking for inbox/unread badges |
| Sprint | Sprint management with velocity tracking |
| Label | Story labels |
| Webhook | Webhook configuration with retry/DLQ |
| Activity | Audit trail per story |
| Notification | In-app notifications |

### Multi-Tenant Architecture

- Organization model owns Projects, Agents, Goals, Budget Policies, and billing
- OrgMember with RBAC roles: OWNER, ADMIN, MEMBER
- User.currentOrgId tracks active org, exposed via JWT session.user.orgId
- All project routes use requireProjectAccess() helper for auth
- All org routes use checkOrgPermission() helper
- Billing is org-level: Paddle webhook/portal use org metadata
- New users auto-get a personal workspace org on signup
- Issue numbering: org-level prefix + auto-incrementing counter (e.g., CP-042)

### Plan Limits

| Tier | Projects | Stories/Project | AI Rewrites/Month | Model | Agents | Priority Queue |
|------|----------|-----------------|-------------------|-------|--------|---------------|
| FREE | 3 | 15 | 15 | Haiku | 1 | No |
| PRO | Unlimited | Unlimited | 50 | Sonnet | 3 | No |
| PRO_MAX | Unlimited | Unlimited | Unlimited | Sonnet | 5 | Yes |

### Permissions Matrix

| Permission | OWNER | ADMIN | MEMBER |
|------------|-------|-------|--------|
| org:delete | Yes | No | No |
| org:billing | Yes | No | No |
| org:settings | Yes | Yes | No |
| org:members | Yes | Yes | No |
| org:budget | Yes | Yes | No |
| org:approvals | Yes | Yes | No |
| org:goals | Yes | Yes | No (read-only via project) |
| project:create | Yes | Yes | No |
| project:delete | Yes | Yes | No |
| project:settings | Yes | Yes | No |
| project:agent | Yes | Yes | No |
| project:git | Yes | Yes | No |
| project:read | Yes | Yes | Yes |
| story:crud | Yes | Yes | Yes |
| sprint:crud | Yes | Yes | Yes |

## Build & Test

```bash
# Build
npm run build

# Test (Vitest)
npm test

# Lint
npm run lint

# E2E tests (Playwright)
npm run test:e2e

# Prisma generate (after schema changes)
npx prisma generate

# Prisma push (apply schema to DB)
npx prisma db push
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing
- ALWAYS run `npx prisma generate` after schema changes
- ALWAYS run `npx prisma db push` after schema changes to sync database
- Current test suite: 39 files, 680+ tests (Vitest unit + Playwright E2E)

### Prisma Notes

- Using Prisma v6 (not v7) — import from `@prisma/client`
- Seed: prisma/seed.ts
- Demo user: demo@codepylot.dev with "Demo Workspace" org
- E2E test DB seeded via e2e/seed-test-db.ts (4 users, 2 orgs, public project)

## Security Conventions

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries (Zod schemas in src/lib/validations/)
- Always sanitize file paths to prevent directory traversal
- Always use `requireProjectAccess()` for project API route auth
- Always use `checkOrgPermission()` for org-level API route auth
- Always use `parseJsonBody()` for request body parsing (size limits)
- Always use `sanitizeError()` / `stripSecrets()` for error responses
- Always use `isValidTransition()` for story status changes
- Always use `isPublicUrl()` for webhook/deploy URL validation (SSRF prevention)
- Always encrypt sensitive fields with `encrypt()` from src/lib/encryption.ts
- Always use `safeDecrypt()` for reading encrypted adapter config fields
- AI prompts must separate system instructions from user input (systemPrompt/userMessage)
- Rate limits: apiRateLimit (60/min), aiRateLimit (10/min), authRateLimit (10/min)
- Review enforcement: agent stories require `reviewedAt` before REVIEW→DONE transition (server-side 422)
- Budget enforcement: `checkBudget()` gates all agent invocations; `checkBudgetAfterCost()` creates incidents
- Approval four-eyes: requester cannot decide on their own approval (unless single-owner org)
- Webhook HMAC: routine webhook triggers require X-Webhook-Timestamp + HMAC-SHA256 signature (5-min replay window)

## Review Enforcement (Trust Gate)

Agent-completed stories cannot be approved without code review:

1. Story moves to REVIEW after agent completes
2. User must view the Diff tab (triggers `POST /confirm-review` → sets `reviewedAt`/`reviewedBy`)
3. Approve/Deploy buttons disabled until `reviewedAt` is set (frontend + server-side)
4. PATCH to status=DONE returns 422 if `reviewedAt` is null for agent stories
5. `reviewedAt`/`reviewedBy` are cleared when story moves away from REVIEW
6. Non-agent stories (manual) are not gated

## Agent System

### Architecture

**Core files:**
- `agent-trigger.ts` — orchestrator: `processNextStory()`, `triggerClaudeAgent()`, budget gate
- `agent-queue.ts` — queue: `resolveMaxAgents()`, `claimAgentSlot()`, `findNextStory()`
- `agent-executor.ts` — execution: `spawnAgent()`, `ensureBranch()`, `getGitBin()`, `getClaudeBin()`, adapter dispatch, workspace integration, goal context injection

**Adapter system** (src/lib/adapters/):
- `types.ts` — `AgentAdapter` interface, `AdapterInvokeParams`, `AdapterResult`
- `registry.ts` — `getAdapter(type)` resolves adapter by `Agent.adapterType`
- `claude-adapter.ts` — Spawns Claude CLI with `--print --dangerously-skip-permissions`
- `openai-adapter.ts` — OpenAI Chat Completions API (encrypted API key via `safeDecrypt()`)
- `ollama-adapter.ts` — Local Ollama API (`OLLAMA_URL` env or localhost:11434, zero cost)
- `http-adapter.ts` — Generic HTTP POST with HMAC signature, SSRF validation via `isPublicUrl()`

**Persistent agents:**
- Agent model with lifecycle: idle → running → idle (cycle), or paused/terminated
- Org chart hierarchy via `reportsTo` self-relation with cycle detection
- Per-agent budget tracking via `totalCostCents`
- Agent status updated on spawn (running) and exit (idle + storiesCompleted increment)

**Heartbeat system:**
- Agents wake on cron schedule (`heartbeatCron` field, evaluated by cron-parser)
- `/api/cron/scheduler` runs every minute, finds due agents, invokes via adapter
- `HeartbeatRun` records every invocation (queued → running → succeeded/failed/timed_out)
- Budget checked before every heartbeat invocation

### Agent Learning

- Rejection feedback stored as Activity records and comments
- Last 5 rejection patterns for the project included in agent prompt context
- Pattern: "PAST REVIEW PATTERNS — The user has previously requested these changes..."
- Goal context injected when story is linked to a goal

### Diff Risk Detection

The diff viewer scans added lines for 7 risk patterns:
- Hardcoded secrets (api_key, password, token)
- Code execution (eval, Function constructor, child_process)
- XSS (dangerouslySetInnerHTML, innerHTML)
- Raw SQL ($queryRawUnsafe)
- Debug logging (console.log/debug)
- Environment variable references
- Unresolved TODOs (TODO, FIXME, HACK, XXX)

## Budget System

- **BudgetPolicy**: Multi-scope (agent/project/org) with monthly or lifetime windows
- **Enforcement**: `checkBudget()` called before every agent invocation in agent-trigger.ts
- **Post-recording**: `checkBudgetAfterCost()` called after every CostEvent, creates incidents at thresholds
- **Soft warning**: At `warnPercent` (default 80%), creates BudgetIncident + notification
- **Hard stop**: At 100%, auto-pauses scope (agent/project/org agents), creates approval for budget override
- **Resume**: OWNER/ADMIN raises limit → incident resolved → agents resumed
- **Dashboard**: `/org/budget` shows all policies with current spend vs limit

## Approval Workflow

- **Types**: `hire_agent` (when org.requireApprovalForAgents is true), `budget_override` (on hard stop)
- **Status lifecycle**: pending → approved / rejected / revision_requested
- **Four-eyes**: Requester cannot approve their own request (unless single-owner org)
- **Auto-execute on approval**: Agent activated (hire_agent) or budget raised + agents resumed (budget_override)
- **UI**: `/org/approvals` with filter tabs, comment threads, action buttons

## Goal Alignment

- **Hierarchy**: company → team → project goals (max depth 3), with cycle detection
- **Story linking**: Optional goalId on stories, selected via dropdown in story detail
- **Progress**: Recursive calculation (stories + child goal stories), displayed as percentage
- **Agent context**: `getGoalContext()` injects goal title + description into agent prompts

## Routine System

- **Routines** replace RecurringStory with cron expressions + timezone support
- **Triggers**: Cron (evaluated every minute by scheduler) or webhook (HMAC/Bearer auth, replay prevention)
- **Concurrency policies**: `always_enqueue`, `skip_if_active`, `coalesce_if_active`
- **RoutineRun** records: source, status (created/skipped/coalesced/failed), linked story

## Webhook System

- Dispatch: src/lib/webhooks.ts → creates delivery records, attempts immediately
- Retry: exponential backoff (30s × 4^attempt, capped at 2h), max 5 attempts
- Dead Letter Queue: exhausted deliveries get status `DEAD_LETTER` (not `FAILED`)
- `FAILED` reserved for permanent failures (SSRF block, webhook deleted)
- Activity log on DLQ entry (WEBHOOK_DEAD_LETTER type)
- Replay: `POST .../deliveries/[deliveryId]/retry` resets to PENDING
- SSRF: `isPublicUrl()` re-validated at delivery time (DNS rebinding prevention)

## Public Board Sharing

- Toggle `isPublic` in project settings
- Public page: `/board/[slug]` (SSR, no auth required)
- Public API: `GET /api/public/projects/[slug]`
- Safe field whitelist: title, shortId, status, type, priority, storyPoints, labels
- NOT exposed: descriptions, comments, agent logs, assignee, API keys, org details, analytics, budgets
- Share button + signup CTA in public board footer
- Private projects return 404 (no information leak)

## Cron Jobs (vercel.json)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/scheduler` | Every 1 min | Heartbeat agent wake-ups + routine trigger evaluation |
| `/api/cron/agent-cleanup` | Every 15 min | Mark RUNNING agents/heartbeats as FAILED/timed_out after 30min |
| `/api/cron/webhook-retry` | Every 5 min | Retry PENDING webhook deliveries |
| `/api/cron/recurring` | Daily 6am | Legacy recurring stories (deprecated, use Routines) |
| `/api/cron/digest` | Daily 8am | Send daily digest emails |

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message
- ALWAYS spawn ALL agents in ONE message for parallel execution

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 5 for tight coordination
- Use specialized strategy for clear role boundaries

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 5 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## Ruflo Agent Team

When using Ruflo for this repository, use the following team:

- Product Manager: coordinator
    - Owns backlog refinement, acceptance criteria, scope control, and sprint planning
    - Must verify that new work matches the product direction in this CLAUDE.md

- Architect: architect
    - Owns system design, file placement, App Router boundaries, API design, and reuse of existing patterns

- Coder: coder
    - Owns implementation
    - Must follow all conventions in this CLAUDE.md exactly
    - Must not bypass parseJsonBody, requireProjectAccess, isValidTransition, sanitizeError, or validation schemas

- Tester: tester
    - Owns Vitest and Playwright coverage
    - Must validate data-testid conventions and avoid regressions

- Security Tester: security-scanner
    - Owns auth, API, upload, webhook, SSRF, IDOR, secret handling, and shell-safety review
    - Must specifically verify the Security Conventions section before marking work ready

Process:
1. Product Manager refines request into acceptance criteria
2. Architect proposes implementation plan
3. Coder implements
4. Tester verifies behavior and regression coverage
5. Security Tester performs security review
6. Only then mark the task complete

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
