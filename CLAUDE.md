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
- **Database**: Prisma v6 (prisma-client-js) + PostgreSQL (via Docker)
- **Auth**: NextAuth v5 beta (JWT sessions, GitHub/Google/Credentials providers)
- **Drag & Drop**: @dnd-kit for Kanban board
- **AI**: @anthropic-ai/sdk for story rewrite + agent code review
- **Data Fetching**: SWR for client data, server components for SSR
- **Charts**: recharts for analytics
- **Animations**: framer-motion
- **Notifications**: sonner (toasts), custom email templates
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
3. Agent auto-assigns based on priority and queue availability
4. Agent creates branch, writes code, calls MCP tools
5. Story moves to REVIEW when agent calls `complete_story`
6. **User must view the diff** before approval (server-side enforced via `reviewedAt`/`reviewedBy`)
7. Diff viewer shows risk indicators (secrets, eval, XSS, raw SQL, debug logging, env vars, TODOs)
8. User approves → code merges to main; or rejects with feedback → agent re-triggers
9. Agent learning: last 5 rejection patterns included in next agent prompt context

### Key Paths

- **Schema**: prisma/schema.prisma
- **Auth**: src/lib/auth.ts (NextAuth config, auto-creates org on signup)
- **Prisma singleton**: src/lib/prisma.ts
- **API auth**: src/lib/api-auth.ts (requireProjectAccess helper)
- **Permissions**: src/lib/permissions.ts (RBAC: OWNER/ADMIN/MEMBER)
- **Plan limits**: src/lib/plan-limits.ts (org-based limits)
- **AI rewrite**: src/lib/ai-rewrite.ts (system/user message separation)
- **Agent orchestration**: src/lib/agent-trigger.ts (thin orchestrator)
- **Agent queue**: src/lib/agent-queue.ts (slot claiming, priority ordering)
- **Agent executor**: src/lib/agent-executor.ts (process spawning, branch management)
- **Webhooks**: src/lib/webhooks.ts (delivery with DLQ)
- **Encryption**: src/lib/encryption.ts (AES-256-GCM)
- **Rate limiting**: src/lib/rate-limit.ts (API, AI, auth limiters)
- **Board**: src/components/board/kanban-board.tsx
- **Story modal**: src/components/stories/story-detail-modal.tsx
- **Diff viewer**: src/components/stories/diff-viewer.tsx (with risk detection)
- **Review panel**: src/components/stories/story-review-panel.tsx
- **Public board**: src/app/board/[slug]/page.tsx

### Multi-Tenant Architecture

- Organization model owns Projects and billing (Paddle subscription per org)
- OrgMember with RBAC roles: OWNER, ADMIN, MEMBER
- User.currentOrgId tracks active org, exposed via JWT session.user.orgId
- All project routes use requireProjectAccess() helper for auth
- Billing is org-level: Paddle webhook/portal use org metadata
- New users auto-get a personal workspace org on signup

### Plan Limits

| Tier | Projects | Stories/Project | AI Rewrites/Month | Model | Agents | Priority Queue |
|------|----------|-----------------|-------------------|-------|--------|---------------|
| FREE | 3 | 15 | 15 | Haiku | 1 | No |
| PRO | Unlimited | Unlimited | 50 | Sonnet | 3 | No |
| PRO_MAX | Unlimited | Unlimited | Unlimited | Sonnet | 5 | Yes |

## Build & Test

```bash
# Build
npm run build

# Test (Vitest)
npm test

# Lint
npm run lint

# Prisma generate (after schema changes)
npx prisma generate

# Prisma push (apply schema to DB)
npx prisma db push
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing
- ALWAYS run `npx prisma generate` after schema changes
- Current test suite: 29 files, 515+ tests

### Prisma Notes

- Using Prisma v6 (not v7) — import from `@prisma/client`
- Seed: prisma/seed.ts
- Demo user: demo@codepylot.dev with "Demo Workspace" org

## Security Conventions

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries (Zod schemas in src/lib/validations/)
- Always sanitize file paths to prevent directory traversal
- Always use `requireProjectAccess()` for API route auth
- Always use `parseJsonBody()` for request body parsing (size limits)
- Always use `sanitizeError()` / `stripSecrets()` for error responses
- Always use `isValidTransition()` for story status changes
- Always use `isPublicUrl()` for webhook/deploy URL validation (SSRF prevention)
- Always encrypt sensitive fields with `encrypt()` from src/lib/encryption.ts
- Never use `safeDecrypt()` to silently accept plaintext — it returns null + warns
- AI prompts must separate system instructions from user input (systemPrompt/userMessage)
- Rate limits: apiRateLimit (60/min), aiRateLimit (10/min), authRateLimit (10/min)
- Review enforcement: agent stories require `reviewedAt` before REVIEW→DONE transition (server-side 422)

## Review Enforcement (Trust Gate)

Agent-completed stories cannot be approved without code review:

1. Story moves to REVIEW after agent completes
2. User must view the Diff tab (triggers `POST /confirm-review` → sets `reviewedAt`/`reviewedBy`)
3. Approve/Deploy buttons disabled until `reviewedAt` is set (frontend + server-side)
4. PATCH to status=DONE returns 422 if `reviewedAt` is null for agent stories
5. `reviewedAt`/`reviewedBy` are cleared when story moves away from REVIEW
6. Non-agent stories (manual) are not gated

## Agent System

### Architecture (3 files)

- `agent-trigger.ts` (116 lines) — orchestrator: `processNextStory()`, `triggerClaudeAgent()`
- `agent-queue.ts` (150 lines) — queue: `resolveMaxAgents()`, `isQueueBlocked()`, `claimAgentSlot()`, `findNextStory()`
- `agent-executor.ts` (324 lines) — execution: `spawnAgent()`, `ensureBranch()`, `getClaudeBin()`

### Agent Learning

- Rejection feedback stored as Activity records and comments
- Last 5 rejection patterns for the project included in agent prompt context
- Pattern: "PAST REVIEW PATTERNS — The user has previously requested these changes..."

### Diff Risk Detection

The diff viewer scans added lines for 7 risk patterns:
- Hardcoded secrets (api_key, password, token)
- Code execution (eval, Function constructor, child_process)
- XSS (dangerouslySetInnerHTML, innerHTML)
- Raw SQL ($queryRawUnsafe)
- Debug logging (console.log/debug)
- Environment variable references
- Unresolved TODOs (TODO, FIXME, HACK, XXX)

## Webhook System

- Dispatch: src/lib/webhooks.ts → creates delivery records, attempts immediately
- Retry: exponential backoff (30s × 4^attempt, capped at 2h), max 5 attempts
- Dead Letter Queue: exhausted deliveries get status `DEAD_LETTER` (not `FAILED`)
- `FAILED` reserved for permanent failures (SSRF block, webhook deleted)
- Activity log on DLQ entry (WEBHOOK_DEAD_LETTER type)
- Replay: `POST .../deliveries/[deliveryId]/retry` resets to PENDING
- List: `GET .../deliveries?status=DEAD_LETTER`
- SSRF: `isPublicUrl()` re-validated at delivery time (DNS rebinding prevention)

## Public Board Sharing

- Toggle `isPublic` in project settings
- Public page: `/board/[slug]` (SSR, no auth required)
- Public API: `GET /api/public/projects/[slug]`
- Safe field whitelist: title, shortId, status, type, priority, storyPoints, labels
- NOT exposed: descriptions, comments, agent logs, assignee, API keys, org details
- Share button + signup CTA in public board footer
- Private projects return 404 (no information leak)

## Cron Jobs (vercel.json)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `/api/cron/agent-cleanup` | Every 15 min | Mark RUNNING agents as FAILED after 30min timeout |
| `/api/cron/webhook-retry` | Every 5 min | Retry PENDING webhook deliveries |
| `/api/cron/recurring` | Daily 6am | Create recurring stories |
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
