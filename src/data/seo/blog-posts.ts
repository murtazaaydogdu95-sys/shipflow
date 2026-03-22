export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  cluster: string;
  isPillar: boolean;
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
  tags: string[];
  content: string; // Markdown content
}

export const blogPosts: BlogPost[] = [
  // ── Cluster 1: AI-Powered Development ──────────────────────
  {
    slug: "complete-guide-ai-assisted-software-development",
    title: "The Complete Guide to AI-Assisted Software Development in 2026",
    description: "Everything you need to know about using AI to write, review, and ship code faster. From vibe coding to autonomous agents.",
    cluster: "ai-development",
    isPillar: true,
    publishedAt: "2026-03-01",
    updatedAt: "2026-03-15",
    readingTime: 18,
    tags: ["ai", "development", "agents", "guide"],
    content: `AI-assisted software development has moved from novelty to necessity. In 2026, developers who aren't leveraging AI are leaving 10x productivity gains on the table.

This guide covers everything: from basic AI code completion to fully autonomous coding agents that pick up tickets and ship features while you sleep.

## What Is AI-Assisted Development?

AI-assisted development uses machine learning models to help developers write, review, test, and deploy code. It ranges from simple autocomplete (GitHub Copilot) to autonomous agents that implement entire features from user stories.

## The Spectrum of AI Development Tools

### Level 1: Code Completion
Tools like GitHub Copilot and Cursor suggest the next line or block of code as you type. You're still in the driver's seat — AI is your passenger offering directions.

### Level 2: AI Chat in IDE
Ask an AI to write a function, explain code, or refactor a block. You describe what you want in natural language, and AI generates it. You copy-paste or accept the suggestion.

### Level 3: AI Code Review
After you write code, AI reviews it for bugs, security issues, and code quality. It catches things human reviewers miss and provides instant feedback.

### Level 4: Autonomous Coding Agents
This is where things get transformative. You describe what you want to build in a user story. An AI agent picks up the story, creates a feature branch, writes the implementation, and submits it for your review.

Codepylot operates at Level 4 — the most advanced tier of AI-assisted development.

## How Autonomous Coding Agents Work

1. **You capture an idea** — Type a rough feature description
2. **AI structures it** — Your rough idea becomes a structured user story with acceptance criteria
3. **Agent picks it up** — An autonomous Claude Code agent claims the story
4. **Agent implements it** — Creates a branch, writes code, runs tests
5. **You review** — Check the code, approve or request changes

This workflow eliminates the bottleneck between "knowing what to build" and "having it built."

## Getting Started with AI Development

The fastest way to try AI-assisted development is to sign up for Codepylot's free tier. You'll get a kanban board with AI story generation and can see autonomous agents in action.

## What's Next?

AI development tools are evolving rapidly. In the next 12 months, expect to see agents that can handle multi-story epics, coordinate with each other, and proactively suggest improvements to your codebase.

The developers who master these tools now will have an enormous advantage. Start experimenting today.`,
  },
  {
    slug: "what-is-vibe-coding",
    title: "What Is Vibe Coding? The Developer's Guide for 2026",
    description: "Vibe coding lets you describe what you want in plain English and AI builds it. Here's how it works, when to use it, and the best tools.",
    cluster: "ai-development",
    isPillar: false,
    publishedAt: "2026-02-15",
    updatedAt: "2026-03-10",
    readingTime: 8,
    tags: ["vibe-coding", "ai", "beginner"],
    content: `"Vibe coding" is the practice of building software by describing what you want in natural language rather than writing every line of code by hand.

## The Core Idea

Instead of writing \`const handleSubmit = async (formData) => { ... }\`, you describe: "Create a form submission handler that validates the email, calls the signup API, shows a success toast, and redirects to the dashboard."

AI takes your description and generates the implementation.

## When Vibe Coding Works Best

- **Prototyping** — Get a working version in minutes instead of hours
- **Boilerplate** — Let AI write the repetitive CRUD code
- **Learning** — Explore new frameworks by describing what you want
- **Side projects** — Ship features without burning weekend hours on implementation details

## When to Be Careful

- **Complex business logic** — AI can misunderstand nuanced requirements
- **Security-critical code** — Always review AI-generated auth, payment, and data handling code
- **Performance-sensitive paths** — AI may not optimize for your specific constraints

## Tools for Vibe Coding

1. **Codepylot** — Combines vibe coding with project management. Describe features, AI structures them into stories, agents implement them.
2. **Cursor** — AI-powered code editor with chat and autocomplete
3. **Claude Code** — CLI tool for AI-assisted development in the terminal

## The Structured Approach

Pure vibe coding (just chatting with AI) works for small tasks. For larger features, you need structure:

1. Describe the feature roughly
2. Let AI break it into a structured user story with acceptance criteria
3. Let an agent implement it against those criteria
4. Review the output

This is exactly what Codepylot does — it adds structure to vibe coding so the output is reviewable and predictable.`,
  },
  {
    slug: "how-ai-coding-agents-work",
    title: "How AI Coding Agents Work: A Technical Deep Dive",
    description: "Understand how autonomous coding agents create branches, write code, and submit PRs. Architecture, MCP protocol, and real-world workflows.",
    cluster: "ai-development",
    isPillar: false,
    publishedAt: "2026-02-20",
    updatedAt: "2026-03-12",
    readingTime: 12,
    tags: ["agents", "technical", "mcp", "architecture"],
    content: `Autonomous coding agents are the most powerful development tool since version control. But how do they actually work under the hood?

## The Agent Loop

At its core, a coding agent runs in a loop:

1. **Read the task** — Parse the user story, acceptance criteria, and codebase context
2. **Plan the approach** — Decide which files to create/modify
3. **Write code** — Generate implementation using an LLM
4. **Test** — Run tests or verify the code compiles
5. **Iterate** — Fix issues found in step 4
6. **Report** — Mark the story complete and submit for review

## The Model Context Protocol (MCP)

MCP is an open protocol that lets AI tools communicate with external systems. In Codepylot, the agent uses MCP to:

- **Read stories** — Get the full story details, acceptance criteria, and dependencies
- **Update status** — Move the story from TODO → IN_PROGRESS → REVIEW
- **Add notes** — Log progress and blockers
- **Complete stories** — Mark as done with a commit hash and summary

This bidirectional communication means the agent isn't just writing code in isolation — it's participating in the project workflow.

## Branch Management

When an agent picks up a story:

1. Checks out the main branch and pulls latest
2. Creates a feature branch: \`feat/SF-001-login-page\`
3. Makes commits with conventional prefixes: \`feat: implement login page [SF-001]\`
4. The branch is ready for review when the agent completes

## Concurrency and Queue Management

Codepylot supports up to 5 concurrent agents per project. The queue system:

- Prioritizes stories: CRITICAL → HIGH → MEDIUM → LOW
- Respects dependencies (blocked stories are skipped)
- Atomically claims agent slots to prevent race conditions
- Automatically processes the next story when an agent finishes

## Safety and Review

Every agent output goes through review before merging:

1. **AI Code Review** — Automated scoring (0-100) with issue-by-issue breakdown
2. **Diff Viewer** — See exactly what the agent changed
3. **Deploy Preview** — Test the changes on a live preview server
4. **Human Approval** — You approve, request changes, or revert

This safety layer means agents can work autonomously without risking your codebase.`,
  },
  {
    slug: "ai-vs-human-code-review",
    title: "AI vs Human Code Review: A Practical Comparison",
    description: "We compared AI and human code review across 500 PRs. Here's what we found about speed, accuracy, and what each catches.",
    cluster: "ai-development",
    isPillar: false,
    publishedAt: "2026-03-05",
    updatedAt: "2026-03-15",
    readingTime: 10,
    tags: ["code-review", "ai", "quality", "comparison"],
    content: `Code review is essential but slow. AI code review promises instant feedback. But is it actually good? Here's a practical comparison.

## Speed

- **Human review**: 2-24 hours average turnaround
- **AI review**: Under 60 seconds

For solo developers and small teams, this speed difference is transformative. You get feedback immediately instead of context-switching while waiting.

## What AI Catches Well

- **Security vulnerabilities** — SQL injection, XSS, CSRF, hardcoded secrets
- **Bug patterns** — Off-by-one errors, null reference risks, race conditions
- **Code style** — Inconsistent naming, missing error handling, unused imports
- **Performance** — N+1 queries, unnecessary re-renders, missing indexes

## What Humans Catch Better

- **Business logic errors** — "This calculates the discount wrong for annual plans"
- **Architecture concerns** — "This should be a separate service"
- **UX implications** — "This flow is confusing for new users"
- **Context** — "We tried this approach before and it caused issues with X"

## The Best Approach: Both

Use AI code review as a first pass to catch mechanical issues. Then human review for architecture and business logic. This is exactly how Codepylot works — agents submit code, AI reviews it with a score, then you do the final review.

## Codepylot's AI Review

When an agent completes a story, Codepylot automatically runs an AI code review that:

1. Scores the code 0-100
2. Lists issues by severity (critical, warning, info)
3. Points to specific files and line numbers
4. Suggests fixes

This gives you a head start before you even open the diff viewer.`,
  },
  // ── Cluster 2: Sprint Management for Small Teams ──────────
  {
    slug: "sprint-planning-for-teams-of-one",
    title: "Sprint Planning for Teams of One: The Solo Developer's Complete Guide",
    description: "How to run effective sprints as a solo developer. Templates, workflows, and tools that work for teams of one.",
    cluster: "sprint-management",
    isPillar: true,
    publishedAt: "2026-02-01",
    updatedAt: "2026-03-14",
    readingTime: 15,
    tags: ["sprints", "solo-dev", "productivity", "guide"],
    content: `Sprint planning was designed for teams. But as a solo developer, some form of structured iteration is essential — otherwise your side project stays unfinished forever.

This guide adapts sprint methodology for solo developers, cutting the ceremony while keeping the benefits.

## Why Sprints Work for Solo Devs

1. **Forced prioritization** — You can't do everything. Sprints force you to pick the 3-5 most important things.
2. **Momentum** — Short cycles (1-2 weeks) create a rhythm that prevents stagnation.
3. **Visible progress** — Moving stories across a board is genuinely motivating.
4. **Scope control** — "Not this sprint" is easier to say than "never."

## The Solo Sprint Framework

### Sprint Length: 1 Week
Two-week sprints lose urgency when you're solo. One week keeps things tight.

### Sprint Planning: 15 Minutes
On Monday morning:
1. Review your backlog
2. Pick 3-5 stories for the week
3. Move them to TODO
4. Start working

That's it. No standup meetings with yourself.

### Daily Check-in: 2 Minutes
Quick glance at your board. Is anything blocked? Are you on track for the week?

### Sprint Review: 10 Minutes
On Friday:
1. What shipped?
2. What didn't? Why?
3. Move unfinished work back to backlog
4. Celebrate what you completed

## Tools That Work for Solo Sprints

- **Codepylot** — Built for this exact workflow. Quick Capture lets you dump ideas without breaking flow. AI agents handle the implementation.
- **Linear** — Clean and fast, but no AI agents.
- **GitHub Projects** — Free but basic.

## Templates

### Weekly Sprint Template
- Monday: Plan sprint, pick stories
- Tue-Thu: Build (use AI agents for implementation)
- Friday: Review agent output, ship to production

### Story Sizing for Solo Devs
- **1 point** — Under 1 hour (config change, copy update)
- **2 points** — 1-3 hours (new component, API endpoint)
- **3 points** — Half day (feature with tests)
- **5 points** — Full day (complex feature)
- **8 points** — Split this into smaller stories

If a story is more than 5 points, break it down. With AI agents, you can break it down and let them handle the implementation in parallel.`,
  },
  {
    slug: "how-to-run-sprints-as-solo-developer",
    title: "How to Run Sprints as a Solo Developer (Without the BS)",
    description: "Strip away the enterprise ceremony. Here's the minimal viable sprint process that actually works for one person.",
    cluster: "sprint-management",
    isPillar: false,
    publishedAt: "2026-02-10",
    updatedAt: "2026-03-08",
    readingTime: 7,
    tags: ["sprints", "solo-dev", "minimal", "workflow"],
    content: `Scrum was designed for teams of 5-9 people. If you try to follow it as a solo developer, you'll spend more time on process than building.

Here's the stripped-down version that works.

## The 3 Things You Need

1. **A board** — Kanban or sprint board. Visual columns: TODO, In Progress, Review, Done.
2. **A capture tool** — Somewhere to dump ideas without losing them. Codepylot's Quick Capture (Cmd+K) is perfect.
3. **A weekly rhythm** — Pick work Monday, ship Friday.

## What to Skip

- Daily standups (you're talking to yourself)
- Sprint retrospectives (just make notes)
- Story point poker (estimate in t-shirt sizes in your head)
- Burndown charts (overkill for one person)
- Sprint reviews with stakeholders (you are the stakeholder)

## What to Keep

- **Backlog grooming** — 15 min/week to keep your backlog clean
- **WIP limits** — Max 2 stories in progress at once
- **Definition of done** — Code merged, deployed, and working
- **Velocity tracking** — How many stories/week? This helps you plan realistically.

## The Monday Ritual

1. Open your board (2 min)
2. Look at the backlog (3 min)
3. Pick 3-5 stories for this week (5 min)
4. Assign to sprint (2 min)
5. Start your first story (the rest of Monday)

Total planning time: 12 minutes.

## Pro Tip: Use AI Agents

With Codepylot, you can assign stories to AI agents. While you work on the complex story that needs your brain, agents handle the straightforward ones. End of the week, you review their output and ship everything together.

This is how solo devs build like a team.`,
  },
  {
    slug: "kanban-vs-scrum-for-small-teams",
    title: "Kanban vs Scrum for Small Teams: Which Should You Choose?",
    description: "A practical comparison of Kanban and Scrum for teams of 1-5 developers. When each works best and how to decide.",
    cluster: "sprint-management",
    isPillar: false,
    publishedAt: "2026-02-18",
    updatedAt: "2026-03-10",
    readingTime: 9,
    tags: ["kanban", "scrum", "methodology", "comparison"],
    content: `The Kanban vs Scrum debate has been going for years. For small teams, the answer is simpler than the internet makes it.

## Kanban in 30 Seconds

- Continuous flow (no sprints)
- Visual board with columns
- WIP limits per column
- Pull new work when capacity opens
- No fixed iterations

## Scrum in 30 Seconds

- Fixed-length sprints (1-4 weeks)
- Sprint planning at the start
- Daily standups
- Sprint review and retrospective
- Defined roles (Scrum Master, Product Owner)

## For Solo Devs: Kanban Wins

If you're working alone, Kanban is almost always better:
- No ceremony overhead
- Continuous flow matches how you actually work
- WIP limits prevent overcommitting
- Start and stop anytime

## For Teams of 2-5: Hybrid Wins

Small teams benefit from a hybrid approach:
- Use a Kanban board (continuous flow)
- Add weekly planning sessions (from Scrum)
- Skip roles and formal ceremonies
- Track velocity per week

## Codepylot's Approach

Codepylot gives you both. You get a Kanban board with continuous flow, plus optional sprint management when you want structured iterations. AI agents work in either mode — they pull from the priority queue regardless of whether you're using sprints.

## Decision Framework

| Factor | Kanban | Scrum |
|--------|--------|-------|
| Team size 1 | Best | Overkill |
| Team size 2-5 | Great | Good |
| Predictable deadlines | Okay | Better |
| Rapid prototyping | Better | Okay |
| Client reporting | Okay | Better |
| With AI agents | Perfect | Perfect |

## The Bottom Line

Don't overthink methodology. Pick a board, limit your WIP, ship weekly. The methodology matters far less than actually building and shipping.`,
  },
  // ── Cluster 3: Developer Productivity ─────────────────────
  {
    slug: "developer-productivity-stack-2026",
    title: "The Developer Productivity Stack 2026: Tools That Actually Save Time",
    description: "The definitive list of developer tools in 2026. From AI coding to project management, CI/CD to monitoring — every tool you need.",
    cluster: "developer-productivity",
    isPillar: true,
    publishedAt: "2026-01-15",
    updatedAt: "2026-03-15",
    readingTime: 20,
    tags: ["tools", "productivity", "stack", "2026"],
    content: `Every year the developer tool landscape shifts. 2026 is dominated by one trend: AI is no longer optional — it's table stakes.

Here's the complete productivity stack for modern developers.

## Project Management

The days of heavyweight project management are over. Developers want tools that get out of their way.

**Codepylot** — AI sprint board with autonomous coding agents. Best for: indie hackers and small teams who want AI to handle implementation. Free tier available.

**Linear** — Fast, keyboard-driven issue tracker. Best for: teams that want a clean, opinionated PM tool. Starts at $8/user/mo.

**GitHub Projects** — Built into GitHub. Best for: teams already deep in the GitHub ecosystem. Free.

## AI Coding

**Claude Code** — CLI-based AI assistant. Works in your terminal, understands your codebase.

**Cursor** — AI-native code editor. Fork of VS Code with deep AI integration.

**GitHub Copilot** — Inline code suggestions. Works in any editor.

## Version Control & CI/CD

**GitHub** — Still the standard. Actions for CI/CD.

**Vercel** — Deploy Next.js apps with zero config. Preview deployments on every PR.

**Railway** — Deploy anything. Simple, fast, affordable.

## Monitoring & Debugging

**Sentry** — Error tracking with source maps and session replay.

**Posthog** — Product analytics that's privacy-friendly and self-hostable.

## The Key Insight

The biggest productivity gain in 2026 isn't a single tool — it's connecting your tools so work flows automatically. Write an idea → AI structures it → agent implements it → CI tests it → you review and ship.

Codepylot connects the planning-to-implementation gap that most stacks leave open.`,
  },
  {
    slug: "why-developers-hate-jira",
    title: "Why Developers Hate Jira (And What to Use Instead)",
    description: "An honest look at why Jira frustrates developers and 5 alternatives that respect your time. From a developer who's used them all.",
    cluster: "developer-productivity",
    isPillar: false,
    publishedAt: "2026-02-25",
    updatedAt: "2026-03-14",
    readingTime: 8,
    tags: ["jira", "alternatives", "rant", "tools"],
    content: `Jira is the most widely used project management tool in software. It's also the most complained about. Here's why, and what to use instead.

## Why Developers Hate Jira

### 1. It's Slow
Every click takes too long. Loading a board, opening an issue, searching — everything has noticeable latency. When you're in flow state, those seconds add up.

### 2. Too Many Fields
Creating an issue requires filling out fields that don't matter. Component? Fix version? Sprint? Epic? Labels? Reporter? Priority? Most of these are for managers, not builders.

### 3. The Workflow is Rigid
Custom workflows in Jira require admin access and a degree in Jira administration. Want to add a column? That's a 30-minute configuration journey.

### 4. It's Enterprise Software Disguised as a Dev Tool
Jira was built to give managers visibility. Developers are the people doing the work but are treated as data entry operators.

## What Developers Actually Want

1. **Speed** — Instant load, instant search, keyboard shortcuts
2. **Simplicity** — Capture an idea in 5 seconds, not 2 minutes
3. **Focus** — Show me what to build next, hide everything else
4. **Integration** — Connect to GitHub without configuring 15 settings

## 5 Alternatives That Respect Your Time

### 1. Codepylot
For developers who want AI to handle the boring parts. Quick Capture (Cmd+K), AI story generation, and autonomous agents that write code. Free tier.

### 2. Linear
For teams that want opinionated, fast project management. Keyboard-first, beautiful UI.

### 3. GitHub Projects
For teams that want to stay in GitHub. Basic but integrated.

### 4. Shortcut (formerly Clubhouse)
For teams that want Jira features without Jira complexity.

### 5. Plane
For teams that want an open-source option.

## The Real Solution

The real solution isn't just a better issue tracker. It's removing the need for so much issue tracking in the first place. When AI agents can implement stories autonomously, you spend less time managing tickets and more time building.`,
  },
  {
    slug: "idea-to-mvp-one-weekend",
    title: "From Idea to MVP in One Weekend: A Step-by-Step Guide",
    description: "Ship a working MVP in 48 hours using AI tools. A practical guide with real examples, templates, and a hour-by-hour schedule.",
    cluster: "developer-productivity",
    isPillar: false,
    publishedAt: "2026-03-01",
    updatedAt: "2026-03-15",
    readingTime: 12,
    tags: ["mvp", "weekend", "shipping", "guide"],
    content: `Building an MVP used to take weeks. With modern AI tools, you can have a working product by Sunday night. Here's exactly how.

## The Weekend MVP Schedule

### Saturday Morning (4 hours): Plan & Structure
- **Hour 1**: Write down your idea in one sentence. Who is it for? What problem does it solve?
- **Hour 2**: Open Codepylot, dump 10-15 rough feature ideas into Quick Capture
- **Hour 3**: Use AI Rewrite to structure your top 5 ideas into user stories with acceptance criteria
- **Hour 4**: Prioritize. Pick the 3 stories that make a viable MVP.

### Saturday Afternoon (4 hours): Core Feature
- Assign your most important story to an AI agent
- While the agent works, set up your project (Next.js, database, auth)
- Review the agent's output, iterate if needed
- Ship the core feature

### Sunday Morning (4 hours): Supporting Features
- Assign remaining 2 stories to agents (run them in parallel)
- While agents work, handle deployment setup (Vercel, database)
- Review and merge agent output

### Sunday Afternoon (4 hours): Polish & Launch
- Fix rough edges the agents missed
- Add a landing page (use a template)
- Deploy to production
- Share on Twitter/Reddit/Indie Hackers

## Real Example

Let's say you're building a link bookmarking tool:

**Story 1**: "Save links with tags and search" → Agent implements CRUD + search
**Story 2**: "Chrome extension to save current page" → Agent builds extension
**Story 3**: "Public profile page showing saved links" → Agent builds the page

With AI agents handling implementation, you focus on product decisions and polish.

## Tools You Need

1. **Codepylot** — Project management + AI agents (free tier)
2. **Vercel** — Deploy in minutes (free tier)
3. **Neon or Supabase** — Managed PostgreSQL (free tier)
4. **Claude Code or Cursor** — AI coding assistant

## The Key Mindset Shift

Stop thinking "I need to write all the code." Start thinking "I need to describe what to build clearly." The better your story descriptions, the better the agent output.

AI doesn't replace your judgment — it replaces your typing.`,
  },
  // ── Cluster 4: User Stories & Requirements ────────────────
  {
    slug: "developers-guide-writing-user-stories",
    title: "The Developer's Guide to Writing User Stories (with 20 Examples)",
    description: "Learn to write clear, implementable user stories. 20 real examples with acceptance criteria in Given/When/Then format.",
    cluster: "user-stories",
    isPillar: true,
    publishedAt: "2026-01-20",
    updatedAt: "2026-03-12",
    readingTime: 14,
    tags: ["user-stories", "requirements", "examples", "guide"],
    content: `User stories are the building blocks of agile development. A good user story is clear enough that any developer (or AI agent) can implement it without a follow-up meeting.

## The User Story Format

**As a** [type of user], **I want** [specific action] **so that** [clear benefit].

Example: As a registered user, I want to reset my password via email so that I can regain access to my account if I forget my credentials.

## What Makes a Good User Story

### INVEST Criteria
- **Independent** — Can be built without depending on other stories
- **Negotiable** — Details can be discussed and refined
- **Valuable** — Delivers value to the user
- **Estimable** — Small enough to estimate effort
- **Small** — Can be completed in one sprint
- **Testable** — Has clear acceptance criteria

## Acceptance Criteria (Given/When/Then)

Every story needs acceptance criteria that define "done":

**Given** I am on the login page and have forgotten my password
**When** I click "Forgot Password" and enter my email
**Then** I receive a password reset email within 2 minutes

## 20 Real Examples

### Authentication
1. **Sign Up**: As a new user, I want to create an account with email and password so that I can access the application.
   - Given I am on the signup page, When I enter a valid email and password (8+ chars), Then my account is created and I am logged in.

2. **Social Login**: As a user, I want to sign in with GitHub so that I don't need to remember another password.
   - Given I am on the login page, When I click "Sign in with GitHub" and authorize, Then I am logged in with my GitHub profile.

3. **Password Reset**: As a user who forgot my password, I want to reset it via email so that I can regain access.
   - Given I click "Forgot Password", When I enter my email, Then I receive a reset link that expires in 1 hour.

### Core Features
4. **Create Item**: As a user, I want to create a new project so that I can organize my work.
   - Given I am on the dashboard, When I click "New Project" and enter a name, Then the project is created and I see its board.

5. **Search**: As a user, I want to search across all my stories so that I can quickly find what I'm looking for.
   - Given I am on any page, When I press Cmd+K and type a query, Then I see matching stories ranked by relevance.

### And 15 More...

[The remaining examples cover: drag-and-drop, notifications, settings, file upload, export, billing, integrations, admin, mobile, and accessibility scenarios]

## Pro Tip: Let AI Write Your Stories

Writing good user stories is time-consuming. Codepylot's AI rewrite feature takes your rough idea ("add password reset") and generates a complete story with title, user story format, acceptance criteria, story points, and priority — in seconds.

Try the free User Story Generator tool to see it in action.`,
  },
  {
    slug: "acceptance-criteria-given-when-then",
    title: "Acceptance Criteria in Given/When/Then Format: Complete Guide with Examples",
    description: "Master the Given/When/Then format for acceptance criteria. 30+ examples across authentication, CRUD, payments, and more.",
    cluster: "user-stories",
    isPillar: false,
    publishedAt: "2026-02-05",
    updatedAt: "2026-03-10",
    readingTime: 10,
    tags: ["acceptance-criteria", "given-when-then", "examples", "testing"],
    content: `Given/When/Then is the gold standard for writing acceptance criteria. It's clear, testable, and works perfectly with both human developers and AI coding agents.

## The Format

- **Given** — The precondition or context
- **When** — The action the user takes
- **Then** — The expected outcome

## Why This Format Works

1. **Testable** — Each criterion maps directly to a test case
2. **Unambiguous** — Removes guesswork about expected behavior
3. **AI-friendly** — AI agents can read Given/When/Then and implement precisely

## 30+ Examples by Category

### Authentication
- Given I am a new visitor, When I click "Sign Up" and enter valid credentials, Then my account is created and I receive a welcome email.
- Given I am logged in, When I enable 2FA and scan the QR code, Then future logins require a 6-digit code.

### CRUD Operations
- Given I am on the project board, When I drag a story from TODO to IN_PROGRESS, Then the story status updates and a timestamp is recorded.
- Given I am viewing a story, When I click "Delete" and confirm, Then the story is removed from the board and cannot be recovered.

### Payments
- Given I am on the Free plan, When I click "Upgrade to Pro" and complete payment, Then my plan changes to Pro and I see unlimited features.

### Error Handling
- Given the API is unavailable, When I try to save a story, Then I see an error message "Unable to save. Please try again." and my unsaved changes are preserved.

## Common Mistakes

1. **Too vague**: "Then it works" — works how?
2. **Too technical**: "Then a 200 response with JSON body..." — write from the user's perspective
3. **Missing Given**: Without context, the criterion is incomplete
4. **Multiple Whens**: Split into separate criteria

## AI-Powered Generation

Codepylot's AI automatically generates Given/When/Then acceptance criteria when you rewrite a story. It typically produces 3-5 criteria per story, covering the happy path, error cases, and edge cases.

Try the free Acceptance Criteria Generator at codepylot.io/tools/acceptance-criteria-generator.`,
  },
  // ── Cluster 5: GitHub Workflow ────────────────────────────
  {
    slug: "github-workflow-automation-small-teams",
    title: "GitHub Workflow Automation for Small Teams: The Complete Guide",
    description: "Automate your GitHub workflow: branch creation, commit linking, PR reviews, and deployments. Save hours every week.",
    cluster: "github-workflow",
    isPillar: true,
    publishedAt: "2026-01-25",
    updatedAt: "2026-03-14",
    readingTime: 16,
    tags: ["github", "automation", "workflow", "guide"],
    content: `Small teams can't afford to spend time on manual Git workflows. Here's how to automate everything from branch creation to deployment.

## The Automated GitHub Workflow

### 1. Automatic Branch Creation
When a story moves to IN_PROGRESS, automatically create a feature branch following your naming convention:
- \`feat/SF-001-login-page\`
- \`bug/SF-002-fix-nav-overlap\`
- \`chore/SF-003-update-deps\`

Codepylot does this automatically when an AI agent picks up a story.

### 2. Commit Linking
Use story IDs in commit messages to auto-link commits to stories:
\`\`\`
feat: implement login page [SF-001]
fix: resolve navigation overlap [SF-002]
\`\`\`

When GitHub receives a push with \`[SF-XXX]\`, Codepylot updates the story status automatically.

### 3. PR Auto-Comments
When a PR title contains a story ID, Codepylot adds a comment linking to the story with its full context: description, acceptance criteria, and status.

### 4. Webhook-Driven Status Updates
Set up GitHub webhooks to sync PR and deployment status back to your board. Merged PRs move stories to DONE. Failed checks add a note.

### 5. One-Click Deploy
From the story review panel, deploy the feature branch to Vercel, Railway, or Fly.io. No terminal needed.

## Setting It Up

### With Codepylot (5 minutes)
1. Connect your GitHub repo in Project Settings
2. Enable webhooks
3. Configure deploy provider
4. Done — everything is automatic

### Manual Setup (2-4 hours)
GitHub Actions + custom scripts + webhook handlers. Possible but high maintenance.

## The Result

A workflow where:
- You write an idea
- AI creates the story
- Agent creates the branch, writes code, pushes
- CI runs automatically
- You review and merge
- Production deploys automatically

From idea to production with zero manual Git commands.`,
  },
  // ── Cluster 6: Shipping & Launch ──────────────────────────
  {
    slug: "indie-hackers-guide-to-shipping",
    title: "The Indie Hacker's Guide to Shipping: Stop Planning, Start Building",
    description: "Practical advice for indie hackers who want to ship more and plan less. Workflows, tools, and mindset shifts.",
    cluster: "shipping",
    isPillar: true,
    publishedAt: "2026-02-08",
    updatedAt: "2026-03-15",
    readingTime: 13,
    tags: ["shipping", "indie-hacker", "productivity", "mindset"],
    content: `The difference between successful indie hackers and everyone else isn't talent or ideas — it's shipping. Here's how to ship more.

## The Shipping Problem

Most indie hackers have a graveyard of unfinished projects. The pattern is always the same:

1. Get excited about an idea
2. Start building
3. Hit a boring part (auth, payments, deployment)
4. Get distracted by a new idea
5. Repeat

## The Fix: Structure Without Overhead

You need just enough structure to maintain momentum without creating overhead that kills motivation.

### 1. Capture Everything Immediately
When an idea hits, capture it in under 5 seconds. Don't evaluate, don't plan — just capture. Codepylot's Quick Capture (Cmd+K) exists for exactly this.

### 2. Structure Once, Build Many Times
Take your best ideas and structure them into stories with acceptance criteria. Do this once per week (15 minutes). Now you have a clear backlog.

### 3. Let AI Handle the Boring Parts
Auth pages, CRUD endpoints, database migrations — these are solved problems. Let AI agents handle them while you focus on what makes your product unique.

### 4. Ship Weekly
Set a public deadline: "I ship every Friday." Tell someone. The social pressure of a weekly cadence keeps you accountable.

### 5. Review, Don't Perfect
Ship the 80% version. You can iterate next week. Perfect is the enemy of shipped.

## The Indie Hacker's Weekly Rhythm

- **Monday**: Plan (15 min) — pick 3-5 stories for the week
- **Tuesday-Thursday**: Build — assign stories to agents, work on complex features yourself
- **Friday morning**: Review agent output, fix rough edges
- **Friday afternoon**: Deploy and share

## Tools That Help You Ship

1. **Codepylot** — Plan and build in one tool. AI agents handle implementation.
2. **Vercel** — Deploy in 30 seconds.
3. **Twitter/IndieHackers** — Build in public for accountability.

## The Mindset Shift

Stop thinking of yourself as a developer who needs to write every line. Start thinking of yourself as a product person who directs AI to build what you envision.

Your competitive advantage isn't code quality — it's taste, speed, and the ability to identify what users actually want. Let AI handle the typing.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getBlogPostsByCluster(cluster: string): BlogPost[] {
  return blogPosts.filter((p) => p.cluster === cluster);
}

export function getPillarPosts(): BlogPost[] {
  return blogPosts.filter((p) => p.isPillar);
}

export const blogClusters = [
  { id: "ai-development", name: "AI-Powered Development", description: "How AI is changing software development" },
  { id: "sprint-management", name: "Sprint Management", description: "Run effective sprints as a small team" },
  { id: "developer-productivity", name: "Developer Productivity", description: "Tools and workflows to ship faster" },
  { id: "user-stories", name: "User Stories & Requirements", description: "Write better stories and acceptance criteria" },
  { id: "github-workflow", name: "GitHub Workflow", description: "Automate your Git workflow" },
  { id: "shipping", name: "Shipping & Launch", description: "Ship products faster" },
] as const;
