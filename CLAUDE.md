# ShipFlow

AI-powered sprint board for indie hackers. Capture rough ideas, let AI structure them into stories, and optionally have Claude Code agents implement them autonomously.

## Quick Start (Docker)

The fastest way to run the full stack:

```bash
# 1. Clone and start everything
docker compose up --build

# 2. Open the app
open http://localhost:3000
```

This starts PostgreSQL, Ollama (with llama3.2), and ShipFlow. Demo data is seeded automatically.
Sign in with `demo@shipflow.dev` / any password.

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

# 5. Seed demo data (demo user: demo@shipflow.dev)
npx prisma db seed

# 6. Start dev server
npm run dev
```

The app runs on `http://localhost:3000`. Sign in with `demo@shipflow.dev` / any password.

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
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4 + shadcn/ui + framer-motion
- **Database:** Prisma v6 + PostgreSQL
- **Auth:** NextAuth v5 beta (JWT sessions, GitHub/Google/Credentials providers)
- **Drag & Drop:** @dnd-kit
- **AI:** @anthropic-ai/sdk (also supports OpenAI, Ollama)
- **Data Fetching:** SWR
- **Charts:** recharts
- **MCP:** @modelcontextprotocol/sdk (packages/mcp-server/)
- **Validation:** Zod v4

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npx prisma db push` | Push schema changes to PostgreSQL |
| `npx prisma db seed` | Seed demo data |
| `npx prisma studio` | Open Prisma Studio GUI |

## Project Structure

```
ShipFlow/
├── prisma/
│   ├── schema.prisma            # Database schema (all models)
│   └── seed.ts                  # Demo data seeder
├── packages/mcp-server/         # MCP server for Claude Code integration
│   └── src/index.ts
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Login page
│   │   ├── (dashboard)/
│   │   │   └── projects/[projectId]/
│   │   │       ├── page.tsx         # Kanban board
│   │   │       ├── settings/        # Project settings
│   │   │       ├── sprints/         # Sprint management
│   │   │       └── analytics/       # Velocity charts
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]   # NextAuth endpoints
│   │   │   ├── projects/            # Project CRUD + nested routes
│   │   │   │   └── [projectId]/
│   │   │   │       ├── stories/     # Story CRUD, rewrite, move
│   │   │   │       ├── sprints/     # Sprint CRUD
│   │   │   │       ├── git-push/    # Git commit + push + merge
│   │   │   │       └── webhook/     # GitHub webhook handler
│   │   │   ├── github/              # GitHub repo import
│   │   │   └── preview/             # Agent preview proxy
│   │   ├── page.tsx                 # Home (project list)
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Tailwind globals
│   ├── components/
│   │   ├── board/                   # Kanban board (dnd-kit)
│   │   ├── stories/                 # Story modals, quick capture
│   │   ├── sprints/                 # Sprint manager, velocity chart
│   │   ├── projects/                # Project list, GitHub import
│   │   ├── layout/                  # Header, sidebar, theme toggle
│   │   ├── providers/               # Session, theme, quick-capture context
│   │   └── ui/                      # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth config
│   │   ├── prisma.ts                # Prisma singleton
│   │   ├── api-auth.ts              # Auth helpers (session + API key)
│   │   ├── agent-trigger.ts         # Agent spawn & queue system
│   │   ├── preview-manager.ts       # Dev server preview lifecycle
│   │   ├── ai-rewrite.ts            # AI providers (Anthropic/OpenAI/Ollama)
│   │   ├── utils.ts                 # cn() utility
│   │   └── validations/             # Zod schemas (story, project, sprint)
│   ├── types/index.ts               # TypeScript types & constants
│   └── middleware.ts                # Auth middleware (protects all routes)
├── Dockerfile                   # Multi-stage build (deps → builder → runner)
├── docker-compose.yml           # PostgreSQL + Ollama + ShipFlow
├── docker-entrypoint.sh         # Wait for DB, push schema, seed, start
├── .dockerignore
└── package.json
```

## Database Models

**Core models** (see `prisma/schema.prisma` for full schema):

- **User** — NextAuth user (email, name, image)
- **Project** — Has name, slug, techStack, githubRepo, agent config, AI config
- **Story** — shortId (SF-001), title, description, status, priority, type, storyPoints, agent fields, branch/commit/preview info
- **AcceptanceCriterion** — Given/When/Then format, linked to Story
- **Sprint** — name, goal, status (PLANNING/ACTIVE/COMPLETED), date range
- **Label** — name + color, scoped per project
- **Activity** — Audit log (STORY_CREATED, STORY_MOVED, AGENT_TRIGGERED, etc.)

### Story Statuses
`BACKLOG` → `TODO` → `IN_PROGRESS` → `REVIEW` → `DONE`

### Story Types
`feature` | `bug` | `chore` | `refactor` | `docs` | `test`

Types determine branch prefixes (`feat/`, `bug/`, `chore/`, etc.) and commit message prefixes (`feat`, `fix`, `chore`, etc.).

### Priorities
`CRITICAL` | `HIGH` | `MEDIUM` | `LOW`

## How It Works (End to End)

### 1. Capture an Idea
Open Quick Capture (Cmd+K) and type a rough idea like "add stripe webhook for failed payments". Optionally click "Rewrite with AI" to transform it into a structured story with title, user story, acceptance criteria, points, and priority.

### 2. Manage on the Board
Stories appear on the Kanban board. Drag and drop between columns. Click a story to edit details, change priority/type, or view acceptance criteria.

### 3. Agent Implementation (Optional)
Configure a project's working directory and API key in Settings. Enable auto-assign to let Claude Code agents pick up stories automatically:

1. Agent picks highest-priority TODO story
2. Creates a branch: `{type-prefix}/{shortId}-{slug}` (e.g., `feat/SF-001-login-page`)
3. Spawns Claude Code CLI with MCP config pointing to ShipFlow
4. Agent implements the story, calling MCP tools to update status
5. On completion, story moves to REVIEW and a dev preview starts

### 4. Review & Approve
In the story detail modal, review the agent's work:
- **Approve** — merges branch to main, pushes, moves to DONE
- **Request Changes** — sends feedback, re-triggers agent on same branch

### 5. GitHub Integration
Set up a webhook in project settings. On push events with `[SF-XXX]` in commit messages, stories auto-complete. PRs link to stories and update status.

## Agent System

The agent system (`src/lib/agent-trigger.ts`) manages autonomous Claude Code agents:

- **Queue:** One agent per project at a time. Waits for REVIEW approval before next story.
- **Priority:** CRITICAL → HIGH → MEDIUM → LOW, then by creation date.
- **Branch prefixes** by story type: feature→`feat/`, bug→`bug/`, chore→`chore/`, refactor→`refactor/`, docs→`docs/`, test→`test/`
- **Commit prefixes** by story type: feature→`feat`, bug→`fix`, chore→`chore`, refactor→`refactor`, docs→`docs`, test→`test`
- **MCP tools** available to agent: `list_stories`, `get_story`, `get_next_story`, `update_story_status`, `complete_story`, `add_note`
- **Preview:** Auto-starts `npx next dev` on a free port after agent completes. Proxied through `/api/preview/[storyId]/`.

## API Authentication

All API routes support two auth methods:
1. **Session auth** — NextAuth JWT session (browser)
2. **API key auth** — `Authorization: Bearer <project-api-key>` (used by MCP server and external integrations)

## Key Conventions

- **Prisma v6** — Import from `@prisma/client` (not `@/generated/prisma`)
- **Prisma singleton** — Always use `import { prisma } from "@/lib/prisma"`
- **Validation** — Zod schemas in `src/lib/validations/` for all API inputs
- **UI components** — Use shadcn/ui from `@/components/ui/`
- **Utilities** — `cn()` from `@/lib/utils` for className merging
- **Types** — Shared types in `src/types/index.ts`
- **API routes** — Use `authenticateRequest()` from `@/lib/api-auth` for auth
- **Schema changes** — Run `npx prisma db push` (no migrations, using db push)
- **Demo user** — `demo@shipflow.dev` (created by Credentials provider or seed)

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
