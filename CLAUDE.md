# ShipFlow

AI-powered sprint board that turns your ideas into shipped code. Just write what you want — AI structures it into stories, and agents write the code for you.

## Features

- **Quick Capture (Cmd+K)** — Global shortcut to jot down rough ideas with zero friction. No forms, just type.
- **AI Story Rewrite** — One-click transforms rough ideas into structured user stories with title, description, acceptance criteria (Given/When/Then), story points, priority, and type. Powered by Anthropic, OpenAI, or Ollama.
- **Kanban Board** — Drag-and-drop board with Icebox, Backlog, To Do, In Progress, Review, and Done columns. Keyboard navigation, bulk operations, inline editing, priority badges, story point estimates.
- **Agent Automation** — Claude Code agents autonomously pick up TODO stories (respecting dependency blockers), create feature branches, write code, and open dev previews. Configurable up to 3 concurrent agents per project, priority-ordered queue.
- **GitHub Integration** — Import repos, auto-link commits via `[SF-XXX]` tags, webhook-driven status updates, branch creation, push/merge from the UI, and auto-comment on PRs with story links.
- **Sprint Management** — Create sprints with goals and date ranges. Assign stories to sprints. Track Planning, Active, and Completed sprint states.
- **Sprint Analytics** — Velocity charts, burndown tracking, and completion rates across sprints powered by recharts.
- **Billing & Plans** — Free tier (3 projects, 50 stories, 5 AI rewrites/day) and Pro tier ($19/mo — unlimited projects, stories, agent automation, GitHub integration). Lemon Squeezy integration for subscriptions.
- **MCP Server** — Model Context Protocol server (`packages/mcp-server/`) enables Claude Code agents to interact with ShipFlow: list stories, update status, add notes, complete stories.
- **CLI Tool** — Command-line interface (`packages/cli/`) for managing stories: list, view, create, move, note, complete. Uses API key auth.
- **Dark Mode** — Full dark/light theme support via next-themes with system preference detection.
- **Auth** — GitHub OAuth, Google OAuth, credentials login with password hashing (bcrypt), and 2FA/TOTP support via NextAuth v5. JWT sessions.
- **2FA/MFA** — TOTP-based two-factor authentication with QR code setup, backup codes (SHA-256 hashed), and login challenge flow.
- **Password Reset** — Forgot password flow with email token (1-hour expiry) and bcrypt password hashing.
- **GDPR Compliance** — Privacy policy and Terms of Service pages. Account deletion support.
- **Landing Page** — Public marketing page at `/` with hero, features, how-it-works, pricing, and footer. Dashboard at `/dashboard`.
- **Dev Previews** — Auto-starts `next dev` on a free port after agent completes a story. Proxied through `/api/preview/[storyId]/`.
- **Story Dependencies** — Block stories on other stories. Visual blocker indicator on cards. Agent queue respects dependencies.
- **Epics/Grouping** — Parent-child story hierarchy via `parentId`. Epic indicator on cards showing child count.
- **File Attachments** — Upload files/screenshots to stories (10MB limit). Drag-and-drop upload with image preview.
- **Bulk Operations** — Multi-select stories on the board. Bulk change status, priority, or delete. Toggle with `B` key.
- **Keyboard Shortcuts** — Arrow keys to navigate board, Enter to open story, `B` for bulk mode, Space to select, Escape to exit.
- **Export** — Download stories as CSV or JSON from the board toolbar. CSV export includes formula injection prevention.
- **Idea Parking Lot** — Icebox/Someday column (hidden by default, toggle via snowflake button) for ideas not ready for the board.
- **Today View** — Personal dashboard at `/today` showing active stories across all projects, sorted by priority.
- **Agent Logs Viewer** — View agent output logs in the story detail modal. Live auto-refresh when agent is running.
- **Undo/Revert Agent Work** — One-click revert of agent branches, resetting story to TODO.
- **Outgoing Webhooks** — HMAC-SHA256 signed webhook dispatch on story events (created, moved, updated, agent completed). Delivery tracking with exponential backoff retries (5 attempts max, cron-driven).
- **Health Check** — `GET /api/health` returns status with DB connectivity check. No auth required.
- **Rate Limiting** — Upstash Redis rate limiting (with in-memory fallback for local dev) on auth routes (10 req/min) and API routes (60 req/min). Fail-open on Redis errors.
- **Audit Log** — Expanded audit logging for project/org CRUD operations with IP tracking.
- **Admin Dashboard** — Admin-only page with user/project/story counts and user management.
- **Public Roadmap** — Public page at `/roadmap` showing stories from public projects.
- **Changelog** — Public page at `/changelog` rendering CHANGELOG.md with react-markdown.
- **API Documentation** — Swagger UI at `/api/docs` serving an OpenAPI 3.0 spec.
- **Email Digest** — Daily digest cron endpoint compiling unread notifications for users.
- **Agent Failure Recovery** — Cron endpoint to detect stuck agents (>30min) and mark as FAILED.
- **Git Diff Viewer** — Built-in diff viewer in story modal showing file-by-file colored diff with line numbers, additions/deletions, and collapsible file sections.
- **AI Code Review** — Automated code review scores agent output 0-100 with issue-by-issue breakdown (severity, file, line, suggestion). Auto-triggered on agent completion.
- **Multi-Agent** — Run up to 3 Claude Code agents in parallel per project. Configurable in project settings. REVIEW no longer blocks queue.
- **Story Templates** — 8 built-in templates (auth page, CRUD endpoint, landing page, billing integration, etc.) pre-fill quick capture with structured stories.
- **Natural Language Commands** — Type commands like "move SF-001 to done" or "prioritize SF-002 as high" directly in Quick Capture to execute board actions.
- **Codebase-Aware Rewrites** — AI story rewrite includes project file structure and dependencies for context-aware story generation.
- **Story Splitting** — AI splits large ideas into 3-5 smaller stories with inter-story dependencies. Bulk-creates all stories in a transaction.
- **Focus Mode** — Three-panel immersive view: story details, code diff + AI review, agent logs + preview. Keyboard navigation (arrow keys, Escape). Press F on the board.
- **Deploy Integration** — Deploy story branches to Vercel, Railway, Fly.io, or custom webhooks. Configure in project settings, trigger from story review panel.
- **Daily Standup Summary** — AI-generated standup summary with completed, in-progress, blocked, and needs-review stories. Copy-to-clipboard for Slack/Discord.
- **Recurring Stories** — Schedule repeating stories (daily, weekly, monthly) via cron. Configure in project settings. Cron endpoint: `POST /api/cron/recurring`.
- **Mobile PWA** — Web App Manifest for installability on mobile. Standalone display mode, theme color, app icons.
- **Browser Extension** — Chrome extension (`packages/browser-extension/`) for quick story capture from any webpage. Right-click "Send to ShipFlow" context menu. Options page for API config.

## Quick Start (Docker)

The fastest way to run the full stack:

```bash
# 1. Clone and start everything
docker compose up --build

# 2. Open the app
open http://localhost:3000
```

This starts PostgreSQL, Ollama (with llama3.2), and ShipFlow.

**GitHub OAuth:** To enable GitHub login and repo import, set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in your `.env` file. The `.env` file is required by Docker Compose (`env_file`).

### Docker Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  PostgreSQL │◄────│   ShipFlow   │────►│   Ollama    │
│  :5432      │     │   :3000      │     │   :11434    │
└─────────────┘     └──────────────┘     └─────────────┘
   pgdata              repos_data          ollama_data
   (volume)            (volume)            (volume)
```

- **pgdata** — PostgreSQL data (persists across restarts)
- **ollama_data** — Downloaded AI models
- **repos_data** — GitHub-imported repository clones (`/app/repos` in container)

### Useful Docker Commands

```bash
docker compose up --build       # Build and start all services
docker compose up -d            # Start in background
docker compose down             # Stop all services (data persists)
docker compose down -v          # Stop and delete all data (clean slate)
docker compose logs shipflow    # View app logs
docker compose up postgres -d   # Start only PostgreSQL (for local dev)
```

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in values
cp .env.example .env

# 3. Start PostgreSQL (via Docker or install locally)
docker compose up postgres -d

# 4. Push schema to PostgreSQL and generate Prisma client
npx prisma db push

# 5. Start dev server
npm run dev
```

The app runs on `http://localhost:3000`. Sign in with GitHub, Google, or email/password.

## Environment Variables

```
DATABASE_URL="postgresql://shipflow:shipflow@localhost:5432/shipflow"  # PostgreSQL
AUTH_SECRET="<openssl rand -base64 32>"  # NextAuth secret (required)
AUTH_GITHUB_ID=""                        # GitHub OAuth app ID
AUTH_GITHUB_SECRET=""                    # GitHub OAuth app secret
AUTH_GOOGLE_ID=""                        # Google OAuth client ID
AUTH_GOOGLE_SECRET=""                    # Google OAuth client secret
AUTH_TRUST_HOST=true                     # NextAuth trust host
ANTHROPIC_API_KEY=""                     # Anthropic API key (for AI story rewrite)
OLLAMA_URL="http://localhost:11434/v1"   # Ollama URL (http://ollama:11434/v1 in Docker)
SHIPFLOW_REPOS_DIR=""                    # GitHub import clone dir (default: ~/.shipflow/repos, /app/repos in Docker)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
RESEND_API_KEY=""                        # Resend API key (for email notifications)
CRON_SECRET=""                           # Secret for cron endpoints (/api/cron/*)
LEMONSQUEEZY_API_KEY=""                  # Lemon Squeezy API key
LEMONSQUEEZY_STORE_ID=""                 # Lemon Squeezy store ID
LEMONSQUEEZY_WEBHOOK_SECRET=""           # Lemon Squeezy webhook signing secret
LEMONSQUEEZY_PRO_VARIANT_ID=""           # Lemon Squeezy variant ID for Pro plan
SENTRY_DSN=""                            # Sentry DSN (optional, for error tracking)
UPSTASH_REDIS_REST_URL=""                # Upstash Redis URL (for distributed rate limiting)
UPSTASH_REDIS_REST_TOKEN=""              # Upstash Redis token (for distributed rate limiting)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4 + shadcn/ui + framer-motion
- **Database:** Prisma v6 + PostgreSQL
- **Auth:** NextAuth v5 beta (JWT sessions, GitHub/Google/Credentials providers, TOTP 2FA)
- **Drag & Drop:** @dnd-kit
- **AI:** @anthropic-ai/sdk (also supports OpenAI, Ollama)
- **Data Fetching:** SWR
- **Charts:** recharts
- **MCP:** @modelcontextprotocol/sdk (packages/mcp-server/)
- **Rate Limiting:** @upstash/ratelimit + @upstash/redis (with in-memory fallback)
- **Validation:** Zod v4
- **Password Hashing:** bcryptjs
- **2FA:** otpauth + qrcode
- **Markdown:** react-markdown

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npx prisma db push` | Push schema changes to PostgreSQL |
| `npx prisma studio` | Open Prisma Studio GUI |

## Project Structure

```
ShipFlow/
├── prisma/
│   ├── schema.prisma            # Database schema (all models)
│   └── seed.ts                  # Database seeder
├── packages/
│   ├── mcp-server/              # MCP server for Claude Code integration
│   │   └── src/index.ts
│   ├── cli/                     # CLI tool (shipflow command)
│   │   └── src/index.ts
│   └── browser-extension/       # Chrome extension for quick capture
│       ├── manifest.json        # Chrome Manifest V3
│       ├── popup/               # Quick capture popup
│       ├── background/          # Context menu service worker
│       ├── options/             # API config page
│       └── icons/               # Extension icons
├── public/
│   ├── manifest.json            # PWA Web App Manifest
│   ├── icons/                   # PWA app icons (192, 512)
│   ├── openapi.yaml             # OpenAPI 3.0 spec
│   └── uploads/                 # File attachments (gitignored)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/           # Login page
│   │   │   ├── forgot-password/ # Password reset request
│   │   │   ├── reset-password/  # Password reset form
│   │   │   └── verify-2fa/      # 2FA challenge page
│   │   ├── dashboard/page.tsx   # Dashboard (project list, /dashboard)
│   │   ├── (dashboard)/
│   │   │   ├── projects/[projectId]/
│   │   │   │   ├── page.tsx         # Kanban board
│   │   │   │   ├── settings/        # Project settings (webhooks, public roadmap toggle)
│   │   │   │   ├── sprints/         # Sprint management
│   │   │   │   └── analytics/       # Velocity charts
│   │   │   ├── today/           # Personal today view
│   │   │   ├── admin/           # Admin dashboard
│   │   │   └── account/security/# 2FA setup page
│   │   ├── roadmap/             # Public roadmap page
│   │   ├── changelog/           # Public changelog page
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]   # NextAuth endpoints
│   │   │   ├── auth/forgot-password # Password reset token generation
│   │   │   ├── auth/reset-password  # Password reset handler
│   │   │   ├── account/2fa/         # 2FA setup, verify, disable, challenge
│   │   │   ├── admin/               # Admin stats + user list
│   │   │   ├── health/              # Health check endpoint
│   │   │   ├── docs/                # Swagger UI
│   │   │   ├── cron/                # Digest + agent cleanup + recurring stories + webhook retry cron
│   │   │   ├── projects/            # Project CRUD + nested routes
│   │   │   │   └── [projectId]/
│   │   │   │       ├── stories/             # Story CRUD, rewrite, move
│   │   │   │       │   ├── [storyId]/
│   │   │   │       │   │   ├── dependencies/  # Story dependency management
│   │   │   │       │   │   ├── attachments/   # File upload/list
│   │   │   │       │   │   ├── logs/          # Agent log viewer
│   │   │   │       │   │   ├── revert/        # Revert agent work
│   │   │   │       │   │   ├── comments/      # Story comments
│   │   │   │       │   │   ├── move/          # Move story between columns
│   │   │   │       │   │   ├── preview/       # Dev preview management
│   │   │   │       │   │   ├── trigger-agent/ # Manual agent trigger
│   │   │   │       │   │   ├── diff/          # Git diff for agent branch
│   │   │   │       │   │   ├── review/        # AI code review (score + issues)
│   │   │   │       │   │   └── deploy/        # Deploy story branch
│   │   │   │       │   ├── bulk/            # Bulk update/delete stories
│   │   │   │       │   ├── bulk-create/     # Bulk create (story splitting)
│   │   │   │       │   ├── split/           # AI story splitting
│   │   │   │       │   └── export/          # Export stories as CSV/JSON
│   │   │   │       ├── sprints/     # Sprint CRUD
│   │   │   │       ├── recurring/   # Recurring story management
│   │   │   │       ├── standup/     # AI standup summary
│   │   │   │       ├── webhooks/    # Outgoing webhook CRUD
│   │   │   │       ├── git-push/    # Git commit + push + merge
│   │   │   │       └── webhook/     # GitHub incoming webhook handler
│   │   │   ├── github/              # GitHub repo import
│   │   │   └── preview/             # Agent preview proxy
│   │   ├── page.tsx                 # Public landing page (/)
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Tailwind globals
│   ├── components/
│   │   ├── board/                   # Kanban board (dnd-kit), column, card, filters, focus mode
│   │   ├── feed/                    # Pipeline feed view
│   │   ├── landing/                 # Landing page sections (navbar, hero, features, pricing, etc.)
│   │   ├── stories/                 # Story modals, quick capture, diff viewer, AI review, templates, splitter
│   │   ├── today/                   # Today view component
│   │   ├── sprints/                 # Sprint manager, velocity chart
│   │   ├── projects/                # Project list, GitHub import, standup dialog, recurring stories
│   │   ├── layout/                  # Header, sidebar, theme toggle, command palette
│   │   ├── providers/               # Session, theme, quick-capture context
│   │   └── ui/                      # shadcn/ui components
│   ├── hooks/
│   │   └── use-solo-mode.ts         # Solo mode detection hook
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth config (credentials + bcrypt + 2FA)
│   │   ├── prisma.ts                # Prisma singleton
│   │   ├── api-auth.ts              # Auth helpers (session + API key)
│   │   ├── agent-trigger.ts         # Agent spawn & queue (multi-agent, respects deps)
│   │   ├── preview-manager.ts       # Dev server preview lifecycle
│   │   ├── ai-rewrite.ts            # AI providers (Anthropic/OpenAI/Ollama)
│   │   ├── diff-parser.ts           # Unified diff parser
│   │   ├── story-templates.ts       # 8 built-in story templates
│   │   ├── command-parser.ts        # Natural language command parser
│   │   ├── webhooks.ts              # Outgoing webhook dispatch (HMAC-SHA256) with delivery tracking + retries
│   │   ├── story-state-machine.ts   # Story status transition validation (isValidTransition, getValidTransitions)
│   │   ├── api-error.ts             # Error sanitization (stripSecrets, sanitizeError) + parseJsonBody size limits
│   │   ├── audit-log.ts             # Audit log helper
│   │   ├── admin.ts                 # Admin auth helper
│   │   ├── notifications.ts         # Notification creation + email dispatch
│   │   ├── email.ts                 # Email sending (Resend)
│   │   ├── email-templates.ts       # Email templates (reset, digest, assigned, etc.)
│   │   ├── rate-limit.ts            # Upstash Redis rate limiting (in-memory fallback)
│   │   ├── permissions.ts           # RBAC (OWNER/ADMIN/MEMBER)
│   │   ├── plan-limits.ts           # Org-based plan limits
│   │   ├── lemonsqueezy.ts            # Lemon Squeezy helpers
│   │   ├── utils.ts                 # cn() utility
│   │   └── validations/             # Zod schemas (story, project, sprint, webhook, comment, recurring)
│   ├── types/index.ts               # TypeScript types & constants
│   └── middleware.ts                # Auth middleware + rate limiting + 2FA redirect
├── CHANGELOG.md                 # Project changelog
├── Dockerfile                   # Multi-stage build (deps → builder → runner)
├── docker-compose.yml           # PostgreSQL + Ollama + ShipFlow
├── docker-entrypoint.sh         # Wait for DB, push schema, seed, start
├── .dockerignore
└── package.json
```

## Database Models

**Core models** (see `prisma/schema.prisma` for full schema):

- **User** — NextAuth user with email, name, image, passwordHash, 2FA fields (totpSecret, totpEnabled, totpBackupCodes), isAdmin flag
- **Organization** — Multi-tenant org with plan, Lemon Squeezy customer ID, members
- **OrgMember** — RBAC roles: OWNER, ADMIN, MEMBER
- **Project** — Has name, slug, techStack, githubRepo, agent config, AI config, isPublic, webhooks, deploy config, maxConcurrentAgents
- **Story** — shortId (SF-001), title, description, status, priority, type, storyPoints, parentId (for epics), agent fields, branch/commit/preview info, AI review fields, deploy fields
- **StoryDependency** — Blocker/blocked relationship between stories
- **Attachment** — File attachments on stories (filename, url, size, mimeType)
- **AcceptanceCriterion** — Given/When/Then format, linked to Story
- **Sprint** — name, goal, status (PLANNING/ACTIVE/COMPLETED), date range
- **Label** — name + color, scoped per project
- **Activity** — Audit log (STORY_CREATED, STORY_MOVED, AGENT_TRIGGERED, PROJECT_CREATED, etc.)
- **Comment** — Story comments with user attribution
- **Notification** — In-app notifications (assigned, status changed, agent completed)
- **Webhook** — Outgoing webhook config (url, events, HMAC secret, active flag)
- **WebhookDelivery** — Delivery tracking with status (PENDING/SUCCESS/FAILED), retry count, exponential backoff, response logging
- **AuditLog** — Org-level audit log with action, details, IP address
- **Subscription** — Lemon Squeezy subscription tracking (org or user level)
- **RecurringStory** — Scheduled repeating stories (daily/weekly/monthly) with frequency config

### Story Statuses
`ICEBOX` | `BACKLOG` → `TODO` → `IN_PROGRESS` → `REVIEW` → `DONE`

- `ICEBOX` — Someday/parking lot. Hidden column on board by default (toggle with snowflake button).
- `BACKLOG` through `DONE` — Standard board columns, always visible.

**State machine enforced** via `src/lib/story-state-machine.ts`. Invalid transitions return 422. Valid transitions:

| From | Allowed To |
|------|-----------|
| ICEBOX | BACKLOG, TODO |
| BACKLOG | ICEBOX, TODO |
| TODO | BACKLOG, ICEBOX, IN_PROGRESS |
| IN_PROGRESS | TODO, REVIEW, DONE |
| REVIEW | IN_PROGRESS, TODO, DONE |
| DONE | REVIEW, TODO |

**Sprint state machine:** PLANNING → ACTIVE → COMPLETED (no skipping, no reversal).

### Story Types
`feature` | `bug` | `chore` | `refactor` | `docs` | `test`

Types determine branch prefixes (`feat/`, `bug/`, `chore/`, etc.) and commit message prefixes (`feat`, `fix`, `chore`, etc.).

### Priorities
`CRITICAL` | `HIGH` | `MEDIUM` | `LOW`

## How It Works (End to End)

### 1. Capture an Idea
Open Quick Capture (Cmd+K) and type a rough idea like "add webhook for failed payments". Optionally click "Rewrite with AI" to transform it into a structured story with title, user story, acceptance criteria, points, and priority. Use ICEBOX status for ideas you're not ready to work on yet.

### 2. Manage on the Board
Stories appear on the Kanban board. Drag and drop between columns. Click a story to edit details, change priority/type, view acceptance criteria, manage dependencies, upload attachments, or view agent logs. Use keyboard shortcuts (arrow keys, Enter, B for bulk) for fast navigation. Export stories as CSV or JSON from the toolbar.

### 3. Agent Implementation (Optional)
Configure a project's working directory and API key in Settings. Enable auto-assign to let Claude Code agents pick up stories automatically:

1. Agent picks highest-priority unblocked TODO story (respects dependency blockers)
2. Creates a branch: `{type-prefix}/{shortId}-{slug}` (e.g., `feat/SF-001-login-page`)
3. Spawns Claude Code CLI with MCP config pointing to ShipFlow
4. Agent implements the story, calling MCP tools to update status
5. On completion, story moves to REVIEW and a dev preview starts
6. View live agent logs in the story detail modal

### 4. Review & Approve
In the story detail modal, review the agent's work:
- **Approve** — merges branch to main, pushes, moves to DONE
- **Request Changes** — sends feedback, re-triggers agent on same branch
- **Revert** — deletes agent branch, resets story to TODO

### 5. GitHub Integration
Set up a webhook in project settings. On push events with `[SF-XXX]` in commit messages, stories auto-complete. PRs with `[SF-XXX]` in the title get auto-comments linking to the story.

### 6. Today View
Visit `/today` for a personal dashboard showing all your active stories across projects, sorted by priority. Sections: In Progress, Needs Review, Up Next, Recently Completed.

## Agent System

The agent system (`src/lib/agent-trigger.ts`) manages autonomous Claude Code agents:

- **Queue:** Configurable concurrency (1-3 agents per project via `maxConcurrentAgents`). REVIEW stories no longer block queue.
- **Priority:** CRITICAL → HIGH → MEDIUM → LOW, then by creation date.
- **Dependencies:** Agent skips blocked stories (stories with unresolved StoryDependency blockers).
- **Timeout:** Stuck agents (RUNNING > 30min) are marked FAILED by the cleanup cron (`/api/cron/agent-cleanup`).
- **Branch prefixes** by story type: feature→`feat/`, bug→`bug/`, chore→`chore/`, refactor→`refactor/`, docs→`docs/`, test→`test/`
- **Commit prefixes** by story type: feature→`feat`, bug→`fix`, chore→`chore`, refactor→`refactor`, docs→`docs`, test→`test`
- **MCP tools** available to agent: `list_stories`, `get_story`, `get_next_story`, `update_story_status`, `complete_story`, `add_note`
- **Logs:** Agent output written to `/tmp/shipflow-agent-{storyId}.log`. Viewable in story detail modal via `/api/projects/[projectId]/stories/[storyId]/logs`.
- **Preview:** Auto-starts `npx next dev` on a free port after agent completes. Proxied through `/api/preview/[storyId]/`.
- **Revert:** `POST /api/projects/[projectId]/stories/[storyId]/revert` deletes the agent branch and resets the story.
- **AI Review:** Auto-triggered on agent completion. Scores code 0-100 with issue-by-issue breakdown.

## API Authentication

All API routes support two auth methods:
1. **Session auth** — NextAuth JWT session (browser)
2. **API key auth** — `Authorization: Bearer <project-api-key>` (used by MCP server, CLI, and external integrations)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` | Open Quick Capture |
| Arrow keys | Navigate board columns/stories |
| `Enter` | Open focused story detail |
| `B` | Toggle bulk selection mode |
| `Space` | Select/deselect story (in bulk mode) |
| `F` | Enter Focus Mode with current story |
| `Escape` | Exit bulk mode / Exit Focus Mode |

## Key Conventions

- **Prisma v6** — Import from `@prisma/client` (not `@/generated/prisma`)
- **Prisma singleton** — Always use `import { prisma } from "@/lib/prisma"`
- **Validation** — Zod schemas in `src/lib/validations/` for all API inputs
- **UI components** — Use shadcn/ui from `@/components/ui/`
- **Utilities** — `cn()` from `@/lib/utils` for className merging
- **Types** — Shared types in `src/types/index.ts`. `STORY_STATUSES` (board-visible) and `ALL_STORY_STATUSES` (includes ICEBOX).
- **API routes** — Use `requireProjectAccess()` from `@/lib/api-auth` for auth
- **Schema changes** — Run `npx prisma db push` (no migrations, using db push)
- **File uploads** — Stored in `public/uploads/`, max 10MB per file. SVG uploads are blocked (XSS risk).
- **Rate limiting** — Auth routes: 10 req/min, API routes: 60 req/min. Upstash Redis when `UPSTASH_REDIS_REST_URL` is set, in-memory fallback otherwise. Fail-open on Redis errors.

## Security Conventions

All API routes follow these hardened patterns established during production QA:

- **Request body size limits** — Every route accepting JSON must use `parseJsonBody(req, maxBytes)` from `@/lib/api-error`. Never use `await req.json()` directly. Typical limits: 1KB for simple actions, 4KB for forms, 64KB for AI, 512KB for stories, 1MB for bulk.
- **Secret comparison** — Always use `crypto.timingSafeEqual()` for comparing secrets (cron tokens, webhook secrets, API keys). Never use `===` for secret strings.
- **Error sanitization** — Use `sanitizeError(err, fallback)` from `@/lib/api-error` in catch blocks. Never expose raw `err.message` to clients — it may contain tokens or internal paths. `stripSecrets()` auto-redacts GitHub tokens, Bearer tokens, and URL credentials from logs.
- **Shell commands** — Always use `execFileSync`/`execFile` with array arguments. Never use `execSync` with string interpolation (shell injection risk).
- **Story-project ownership** — Sub-resource routes (comments, attachments, logs, dependencies, etc.) must verify `{ id: storyId, projectId }` before proceeding. Prevents cross-project IDOR.
- **Story state machine** — Use `isValidTransition(from, to)` from `@/lib/story-state-machine` when updating story status via API. Returns 422 on invalid transitions.
- **RBAC privilege escalation** — Only users with OWNER role can assign the OWNER role to others. Check caller's role before allowing role changes.
- **2FA enforcement** — Middleware blocks both page routes AND API routes when `requires2FA` is true (except `/api/auth/*` and `/api/account/2fa/*`).
- **HTML escaping in emails** — Use `esc()` from `@/lib/email-templates` for all user-controlled content in email HTML. Prevents stored XSS via email injection.
- **CSV export** — Use `csvEscape()` which prefixes values starting with `=+\-@` with `'` to prevent formula injection in spreadsheets.
- **Webhook secrets** — Never return webhook `secret` field in API responses. Use Prisma `select` to exclude it.
- **Preview/agent fields** — `previewPort` and `previewPid` are excluded from `updateStorySchema`. Only the internal preview-manager sets these.
- **SSRF protection** — Validate user-controlled URLs with `isPublicUrl()` before making server-side requests (deploy webhooks, etc.).
- **Branch name validation** — `branchName` is validated with `/^[a-zA-Z0-9\/_.\-]+$/` regex in Zod schema to prevent injection.
- **File upload types** — SVG uploads are blocked (can contain embedded JavaScript). Allowed: images (PNG, JPG, GIF, WebP), PDF, and text files.

## MCP Server

Located at `packages/mcp-server/`. Build and configure:

```bash
cd packages/mcp-server
npm install && npm run build
```

Environment for MCP server:
```
SHIPFLOW_API_URL=http://localhost:3000
SHIPFLOW_API_KEY=<project-api-key>
SHIPFLOW_PROJECT_ID=<project-id>
```

The MCP server is automatically configured when the agent trigger system spawns Claude Code.

## CLI Tool

Located at `packages/cli/`. Build and install:

```bash
cd packages/cli
npm install && npm run build
```

Environment for CLI:
```
SHIPFLOW_API_URL=http://localhost:3000
SHIPFLOW_API_KEY=<project-api-key>
SHIPFLOW_PROJECT_ID=<project-id>
```

Commands: `shipflow stories`, `shipflow story <id>`, `shipflow create "title"`, `shipflow move <id> <status>`, `shipflow note <id> "msg"`, `shipflow complete <id>`
