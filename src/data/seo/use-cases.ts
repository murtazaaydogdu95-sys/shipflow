export type UseCase = {
  slug: string;
  name: string;
  persona: string;
  heroTitle: string;
  heroDescription: string;
  painPoints: string[];
  solutions: { title: string; description: string }[];
  features: { name: string; description: string; icon: string }[];
  workflow: { step: number; title: string; description: string }[];
  testimonialQuote: string;
  testimonialAuthor: string;
  ctaText: string;
};

export const useCases: UseCase[] = [
  {
    slug: "indie-hackers",
    name: "Indie Hackers",
    persona: "Indie Hacker",
    heroTitle:
      "Codepylot for Indie Hackers — Ship 10x Faster with AI-Powered Sprint Planning",
    heroDescription:
      "Stop drowning in feature lists and start shipping revenue-generating features. Codepylot turns your rough product ideas into structured stories, then AI agents write the code while you focus on marketing and growth. Build your SaaS empire without hiring a team.",
    painPoints: [
      "You have dozens of feature ideas scattered across notes, tweets, and DMs but no structured way to prioritize and execute them",
      "Coding every feature yourself is a bottleneck — you spend 80% of your time writing code and only 20% on marketing, sales, and customer development",
      "Traditional project management tools like Jira and Linear are designed for teams, not solo builders — they add overhead without value",
      "You ship features but lose momentum context-switching between building, deploying, and promoting your product",
    ],
    solutions: [
      {
        title: "Capture ideas at the speed of thought",
        description:
          "Hit Cmd+K anywhere and dump your rough idea — 'add Stripe webhook for failed payments' — and Codepylot's AI transforms it into a structured user story with acceptance criteria, story points, and priority. No forms, no friction.",
      },
      {
        title: "AI agents write your code autonomously",
        description:
          "Codepylot's Claude Code agents pick up your TODO stories, create feature branches, write production-ready code, and submit it for review. You review and merge instead of writing every line yourself.",
      },
      {
        title: "Built for solo builders, not enterprise teams",
        description:
          "A clean Kanban board with keyboard shortcuts, quick capture, and zero configuration. No sprint ceremonies, no standups, no bloat. Just you, your ideas, and shipping.",
      },
      {
        title: "Stay in flow from idea to deployed feature",
        description:
          "GitHub integration auto-links commits, deploy previews let you test instantly, and one-click merge gets features to production. The entire build-review-ship cycle stays in one tool.",
      },
    ],
    features: [
      {
        name: "Quick Capture",
        description:
          "Global Cmd+K shortcut lets you capture feature ideas without leaving your current context. Type rough thoughts and AI structures them into actionable stories.",
        icon: "Zap",
      },
      {
        name: "AI Story Rewrite",
        description:
          "One click transforms 'add pricing page' into a full user story with Given/When/Then acceptance criteria, story points, priority, and implementation hints.",
        icon: "Sparkles",
      },
      {
        name: "Autonomous Code Agents",
        description:
          "Claude Code agents autonomously implement your stories — creating branches, writing code, and submitting for review while you work on growth.",
        icon: "Bot",
      },
      {
        name: "Deploy Previews",
        description:
          "Every completed story gets an instant deploy preview so you can verify the feature works before merging to production.",
        icon: "Eye",
      },
      {
        name: "One-Click Ship",
        description:
          "Review the AI-generated code, approve it, and merge to main with a single click. GitHub integration handles the rest.",
        icon: "Rocket",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Dump your idea",
        description:
          "Hit Cmd+K and type whatever is on your mind — 'users should be able to upgrade to annual billing with a discount'. No formatting required.",
      },
      {
        step: 2,
        title: "AI structures it",
        description:
          "Codepylot rewrites your rough idea into a structured story with title, description, acceptance criteria, and priority. Review it, tweak if needed, and add to your board.",
      },
      {
        step: 3,
        title: "Agent builds it",
        description:
          "A Claude Code agent picks up the story, creates a feature branch, writes the implementation, and moves it to review. Watch progress in real-time via agent logs.",
      },
      {
        step: 4,
        title: "Review and ship",
        description:
          "Check the deploy preview, review the AI-generated code with built-in diff viewer, and hit approve to merge to main. Your feature is live.",
      },
    ],
    testimonialQuote:
      "I was spending every weekend coding features for my SaaS. Now I spend 30 minutes reviewing what the AI agent built and the rest of the time on customer calls. My MRR grew 3x in two months because I finally had time to focus on what matters.",
    testimonialAuthor: "Marcus Chen, founder of InvoiceFlow ($8K MRR)",
    ctaText: "Start shipping features, not just writing code",
  },
  {
    slug: "solo-developers",
    name: "Solo Developers",
    persona: "Solo Developer",
    heroTitle:
      "Codepylot for Solo Developers — Your AI-Powered Development Partner",
    heroDescription:
      "Being a solo developer does not mean you have to do everything alone. Codepylot gives you an AI development team that turns your ideas into structured stories and writes production-ready code. Focus on architecture and decisions while AI handles the implementation.",
    painPoints: [
      "You are the architect, developer, QA, and DevOps all at once — context-switching between roles destroys your productivity and code quality",
      "Keeping track of what to build next is chaotic without a lightweight system — sticky notes and text files do not scale",
      "Boilerplate and repetitive code consume hours that could be spent on the interesting, high-value parts of your project",
      "Code review is nonexistent when you are the only developer, leading to bugs and technical debt that compound over time",
    ],
    solutions: [
      {
        title: "Structured thinking without the overhead",
        description:
          "Codepylot's AI takes your stream-of-consciousness ideas and transforms them into well-defined stories with acceptance criteria. You think clearly about what to build without filling out forms.",
      },
      {
        title: "Delegate implementation to AI agents",
        description:
          "Let Claude Code agents handle the boilerplate, CRUD endpoints, and repetitive tasks. You focus on system design and the complex logic that requires human judgment.",
      },
      {
        title: "AI code review catches what you miss",
        description:
          "Every piece of agent-written code gets an automated AI review scoring 0-100 with issue-by-issue breakdown. It is like having a senior developer reviewing your PRs.",
      },
      {
        title: "A Kanban board that works for one person",
        description:
          "Keyboard-driven navigation, drag-and-drop, and zero mandatory fields. Add stories in seconds, organize with priorities and types, and track progress without ceremony.",
      },
    ],
    features: [
      {
        name: "AI Code Review",
        description:
          "Automated code review scores agent output 0-100 with severity-tagged issues, file references, and concrete suggestions. Your always-available code reviewer.",
        icon: "Shield",
      },
      {
        name: "Keyboard-First Board",
        description:
          "Arrow keys to navigate, Enter to open, B for bulk mode, F for focus mode. Built for developers who live in the terminal.",
        icon: "Keyboard",
      },
      {
        name: "Story Dependencies",
        description:
          "Define which stories block others. The agent queue automatically respects dependencies so features are built in the right order.",
        icon: "GitBranch",
      },
      {
        name: "Focus Mode",
        description:
          "Three-panel immersive view showing story details, code diff with AI review, and agent logs with deploy preview. Everything you need in one screen.",
        icon: "Maximize",
      },
      {
        name: "Codebase-Aware AI",
        description:
          "AI story rewrites include your project's file structure and dependencies for context-aware story generation that matches your architecture.",
        icon: "Brain",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Plan your sprint",
        description:
          "Capture ideas throughout the week with Cmd+K. On Monday, review your backlog, prioritize stories, and let AI rewrite any rough ideas into structured specs.",
      },
      {
        step: 2,
        title: "Assign to agents",
        description:
          "Move your top-priority stories to TODO. Codepylot's agents automatically pick them up in priority order, respecting any dependency chains you have defined.",
      },
      {
        step: 3,
        title: "Review in Focus Mode",
        description:
          "Press F to enter Focus Mode. Review the code diff, check the AI review score and flagged issues, and verify behavior in the deploy preview — all without leaving the board.",
      },
      {
        step: 4,
        title: "Merge and iterate",
        description:
          "Approve the work, merge to main, and the story moves to Done. If something needs changes, send feedback and the agent re-implements on the same branch.",
      },
    ],
    testimonialQuote:
      "I used to spend my entire Sunday on boilerplate — setting up API routes, writing validation, creating forms. Now the agent handles all of that and I spend my time on the parts I actually enjoy. It is like pair programming with someone who never gets tired.",
    testimonialAuthor: "Sophie Laurent, full-stack developer and creator of DevMetrics",
    ctaText: "Get your AI development partner today",
  },
  {
    slug: "side-projects",
    name: "Side Projects",
    persona: "Side Project Builder",
    heroTitle:
      "Codepylot for Side Projects — Ship Your Ideas in Hours, Not Months",
    heroDescription:
      "Your side project deserves better than a graveyard of half-finished repos. Codepylot helps you make real progress in the limited time you have — AI structures your ideas, agents write the code, and you ship features in evening sessions instead of losing momentum over months.",
    painPoints: [
      "You only have evenings and weekends to work on your side project, and most of that time is spent remembering where you left off instead of making progress",
      "Your side project ideas are exciting at first, but the grind of implementation leads to abandoned repos and unfinished dreams",
      "Context-switching between your day job and side project means you waste 30 minutes each session just getting back up to speed",
      "You keep starting new projects instead of finishing existing ones because the excitement of a fresh idea beats the tedium of implementation",
    ],
    solutions: [
      {
        title: "Pick up exactly where you left off",
        description:
          "Your Kanban board shows exactly what is in progress, what is next, and what is done. Open Codepylot, see your TODO stories, and start building immediately — no more 'where was I?' moments.",
      },
      {
        title: "Make progress while you sleep",
        description:
          "Queue up stories before bed and let AI agents work on them. Wake up to completed features with deploy previews ready for review. Your side project makes progress even when you cannot.",
      },
      {
        title: "Break big ideas into shippable pieces",
        description:
          "Codepylot's AI story splitter takes your ambitious feature idea and breaks it into 3-5 small, well-defined stories that you can ship one at a time. Momentum, not perfection.",
      },
      {
        title: "Finish what you start",
        description:
          "The board gives you a visual sense of progress that keeps you motivated. Stories moving from TODO to In Progress to Done creates the dopamine loop that makes you want to keep going.",
      },
    ],
    features: [
      {
        name: "AI Story Splitter",
        description:
          "Paste a big feature idea and AI breaks it into 3-5 small, independent stories with dependencies. Ship incrementally instead of getting overwhelmed.",
        icon: "Scissors",
      },
      {
        name: "Icebox Column",
        description:
          "Park ideas you are not ready to build in the Icebox. They are out of sight but never lost. Toggle visibility with one click when you need inspiration.",
        icon: "Snowflake",
      },
      {
        name: "Agent Queue",
        description:
          "Queue multiple stories and AI agents work through them in priority order. Set up your sprint on Sunday night and review completed work throughout the week.",
        icon: "ListOrdered",
      },
      {
        name: "Sprint Goals",
        description:
          "Set a weekly sprint goal like 'launch billing page' to keep yourself focused. Track completion rate and velocity across sprints to see your real progress.",
        icon: "Target",
      },
      {
        name: "Export and Share",
        description:
          "Export your stories as CSV or JSON. Share progress with friends, co-founders, or your Twitter audience to stay accountable.",
        icon: "Download",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Sunday planning session",
        description:
          "Spend 15 minutes capturing ideas with Cmd+K, letting AI rewrite them into stories, and prioritizing your backlog. Set a sprint goal for the week.",
      },
      {
        step: 2,
        title: "Queue and go",
        description:
          "Move your top 3-5 stories to TODO and let the AI agents start working. Go enjoy your Sunday while implementation happens in the background.",
      },
      {
        step: 3,
        title: "Evening review sessions",
        description:
          "After your day job, open Codepylot, review the code the agents wrote, check deploy previews, and approve or send feedback. 30 minutes of high-leverage work.",
      },
      {
        step: 4,
        title: "Ship on the weekend",
        description:
          "By Saturday, you have 3-5 features merged and deployed. Write a changelog entry, tweet your progress, and plan next week's sprint.",
      },
    ],
    testimonialQuote:
      "I have been 'working on my side project' for two years and had nothing to show for it. Three weeks with Codepylot and I shipped a public beta with auth, billing, and a dashboard. The AI agents built the boring parts while I focused on making it mine.",
    testimonialAuthor: "James Park, software engineer by day, building TaskPilot by night",
    ctaText: "Finally finish your side project",
  },
  {
    slug: "open-source",
    name: "Open Source Maintainers",
    persona: "Open Source Maintainer",
    heroTitle:
      "Codepylot for Open Source — Manage Contributions and Ship Releases Faster",
    heroDescription:
      "Open source maintenance is a labor of love that often feels like a second job. Codepylot helps you triage issues into structured stories, delegate implementation to AI agents, and ship releases faster — so you can focus on community and architecture instead of drowning in PRs.",
    painPoints: [
      "Issue triage is overwhelming — hundreds of feature requests, bug reports, and questions pile up faster than you can process them",
      "Writing good first issues takes almost as much effort as fixing the bug yourself, making it hard to onboard new contributors",
      "You spend more time reviewing low-quality PRs and writing feedback than it would take to just implement the feature yourself",
      "Burnout is real — the never-ending backlog of issues and the guilt of not responding fast enough drains your motivation",
    ],
    solutions: [
      {
        title: "Triage issues into structured stories instantly",
        description:
          "Paste a GitHub issue into quick capture and AI transforms it into a well-defined story with reproduction steps, acceptance criteria, and implementation hints. Triage in seconds, not minutes.",
      },
      {
        title: "Generate perfect good-first-issues",
        description:
          "AI story rewrite creates detailed, contributor-friendly stories with step-by-step guidance. Lower the barrier for new contributors without spending your evening writing instructions.",
      },
      {
        title: "AI agents handle the routine work",
        description:
          "Let agents tackle documentation updates, dependency bumps, test coverage, and simple bug fixes. Reserve your energy for architectural decisions and complex features.",
      },
      {
        title: "AI code review as a first pass",
        description:
          "Codepylot's automated code review scores contributions 0-100 and flags issues before you look at them. Spend your review time on the important stuff, not catching style violations.",
      },
    ],
    features: [
      {
        name: "GitHub Integration",
        description:
          "Import repos, auto-link commits via story tags, webhook-driven status updates, and auto-comment on PRs with story context. Your board stays in sync with GitHub.",
        icon: "Github",
      },
      {
        name: "Public Roadmap",
        description:
          "Toggle project visibility to public and share your roadmap with your community. Transparency builds trust and reduces duplicate feature requests.",
        icon: "Globe",
      },
      {
        name: "Story Templates",
        description:
          "8 built-in templates for common patterns — bug report, feature request, documentation update — pre-fill stories with the right structure for your project.",
        icon: "FileText",
      },
      {
        name: "Bulk Operations",
        description:
          "Multi-select stories and bulk change status, priority, or delete. Triage an entire batch of issues in one action instead of one at a time.",
        icon: "Layers",
      },
      {
        name: "Sprint Analytics",
        description:
          "Velocity charts and burndown tracking across releases. Show your sponsors concrete progress and predict when the next release will ship.",
        icon: "BarChart",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Import and triage",
        description:
          "Connect your GitHub repo and import issues. Use quick capture to transform them into structured stories. Bulk-prioritize and organize your release backlog.",
      },
      {
        step: 2,
        title: "Delegate to agents",
        description:
          "Move routine stories (docs, tests, simple fixes) to TODO for AI agents. Tag complex stories as good-first-issues with AI-generated contributor guides.",
      },
      {
        step: 3,
        title: "Review efficiently",
        description:
          "Agent-completed stories come with AI code review scores. Focus your review energy on architecture and correctness, not formatting and boilerplate.",
      },
      {
        step: 4,
        title: "Ship the release",
        description:
          "Merge approved stories, check the sprint analytics for completion status, and ship your release. Share the public roadmap update with your community.",
      },
    ],
    testimonialQuote:
      "Maintaining a popular open source library while working full-time was destroying me. Codepylot handles the docs updates, test coverage PRs, and simple bug fixes automatically. I finally have time to think about the v3 architecture instead of constantly triaging.",
    testimonialAuthor: "Lena Kowalski, maintainer of react-data-grid (12K stars)",
    ctaText: "Reclaim your open source joy",
  },
  {
    slug: "freelance-developers",
    name: "Freelance Developers",
    persona: "Freelance Developer",
    heroTitle:
      "Codepylot for Freelancers — Deliver Client Projects Faster and More Profitably",
    heroDescription:
      "As a freelance developer, time is money — literally. Codepylot helps you turn client requirements into structured stories, delegate routine implementation to AI agents, and deliver projects in half the time. Take on more clients without burning out.",
    painPoints: [
      "Client requirements are vague and constantly shifting — 'make it modern' is not a spec you can code against",
      "You are stuck billing hourly for work that could be automated, or eating the cost on fixed-price projects that take longer than estimated",
      "Managing multiple client projects simultaneously means constant context-switching and dropped balls",
      "You spend too much time on boilerplate and setup, leaving less time for the custom work clients actually pay for",
    ],
    solutions: [
      {
        title: "Turn vague requirements into clear stories",
        description:
          "Paste your client's email or brief into quick capture. AI transforms 'make the dashboard better' into structured stories with specific acceptance criteria you can reference in client conversations.",
      },
      {
        title: "Deliver fixed-price projects profitably",
        description:
          "AI agents handle 60-70% of routine implementation while you focus on custom business logic and client-specific features. Finish fixed-price projects in half the estimated time.",
      },
      {
        title: "Manage multiple clients on one board",
        description:
          "Separate projects for each client with their own boards, sprints, and priorities. Switch between clients instantly without losing context on any of them.",
      },
      {
        title: "Professional delivery with deploy previews",
        description:
          "Share deploy previews with clients for real-time feedback before going to production. They see progress, you get clear feedback, and everyone stays aligned.",
      },
    ],
    features: [
      {
        name: "Multi-Project Management",
        description:
          "Separate Kanban boards for each client project. Quick-switch between them from the dashboard. Each project has its own backlog, sprints, and agent configuration.",
        icon: "FolderKanban",
      },
      {
        name: "Deploy Previews",
        description:
          "Every completed story gets a preview URL you can share with clients. Get feedback on actual running code, not mockups or screenshots.",
        icon: "ExternalLink",
      },
      {
        name: "Story Points Estimation",
        description:
          "AI-estimated story points help you scope projects accurately. Track velocity across sprints to give clients realistic timelines based on data, not gut feeling.",
        icon: "Calculator",
      },
      {
        name: "CSV Export",
        description:
          "Export stories as CSV for client reporting, invoicing, or importing into their project management tools. Professional deliverables without extra work.",
        icon: "FileSpreadsheet",
      },
      {
        name: "Concurrent Agents",
        description:
          "Run up to 3 AI agents in parallel per project. Queue up a batch of stories and let agents work through them simultaneously for maximum throughput.",
        icon: "Users",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Scope the project",
        description:
          "Paste client requirements into quick capture. AI generates structured stories with acceptance criteria and story point estimates. Use this as your project proposal.",
      },
      {
        step: 2,
        title: "Sprint through implementation",
        description:
          "Prioritize stories for the sprint. Move routine ones to TODO for AI agents and work on complex custom features yourself. Three agents running in parallel triples your throughput.",
      },
      {
        step: 3,
        title: "Share previews for feedback",
        description:
          "Send deploy preview URLs to your client for each completed feature. Collect feedback while the next batch of stories is being built.",
      },
      {
        step: 4,
        title: "Deliver and invoice",
        description:
          "Export completed stories as a CSV deliverable. Merge everything to production, hand off the project, and move on to the next client.",
      },
    ],
    testimonialQuote:
      "I used to take on 2 client projects at a time and feel overwhelmed. Now I comfortably manage 4 simultaneously. The AI agents handle the CRUD, auth flows, and boilerplate while I focus on the custom features that justify my rate. My revenue doubled without working more hours.",
    testimonialAuthor: "Daniel Okafor, freelance full-stack developer",
    ctaText: "Deliver projects faster, earn more",
  },
  {
    slug: "mvp-development",
    name: "MVP Development",
    persona: "MVP Builder",
    heroTitle:
      "Codepylot for MVP Development — Go from Idea to Working Product in Days",
    heroDescription:
      "Stop spending months building an MVP that should take a week. Codepylot's AI breaks your product vision into shippable stories, agents build the features, and you launch your MVP fast enough to actually test your hypothesis before running out of motivation or runway.",
    painPoints: [
      "You spend so long building the 'perfect' MVP that you never actually launch and validate your idea with real users",
      "Feature creep turns a simple MVP into a complex product — you keep adding 'just one more thing' before launch",
      "Setting up auth, billing, dashboards, and other standard features from scratch eats weeks of your MVP timeline",
      "You do not know if your idea will work, but you are investing months of development time before getting any market signal",
    ],
    solutions: [
      {
        title: "AI breaks your vision into an MVP scope",
        description:
          "Describe your product idea and AI splits it into 3-5 essential stories. Each story is a shippable increment — auth, core feature, billing, landing page. No feature creep, just the critical path.",
      },
      {
        title: "Standard features built in hours, not weeks",
        description:
          "AI agents handle auth flows, CRUD endpoints, billing integration, and dashboard layouts. The patterns that take you a week to set up manually are done by afternoon.",
      },
      {
        title: "Launch in days, validate in a week",
        description:
          "With agents handling implementation and you focusing on product decisions, your MVP timeline shrinks from months to days. Get real user feedback while your motivation is still high.",
      },
      {
        title: "Iterate based on feedback, not assumptions",
        description:
          "After launch, capture user feedback as new stories, let AI prioritize them, and have agents implement the changes. Your iteration cycle goes from weeks to days.",
      },
    ],
    features: [
      {
        name: "Story Splitting",
        description:
          "Paste your product idea and AI generates 3-5 well-scoped stories with dependencies. Get a complete MVP roadmap in 30 seconds.",
        icon: "Split",
      },
      {
        name: "Story Templates",
        description:
          "Pre-built templates for auth pages, CRUD endpoints, landing pages, and billing integration. Start with proven patterns instead of blank files.",
        icon: "Layout",
      },
      {
        name: "Priority-Ordered Agent Queue",
        description:
          "Set CRITICAL priority on your core feature, HIGH on auth, MEDIUM on billing. Agents build in the right order so your critical path is always first.",
        icon: "ArrowUpDown",
      },
      {
        name: "Deploy Integration",
        description:
          "Deploy to Vercel, Railway, or Fly.io directly from the review panel. Go from merged code to live product in one click.",
        icon: "Cloud",
      },
      {
        name: "Free Tier",
        description:
          "Start building your MVP for free with 3 projects, 50 stories, and 5 AI rewrites per day. Upgrade when you validate and need to scale.",
        icon: "Gift",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Define your MVP",
        description:
          "Type your product idea into quick capture: 'A tool that lets freelancers track time and generate invoices'. AI splits it into 3-5 core stories with dependencies.",
      },
      {
        step: 2,
        title: "Agents build the foundation",
        description:
          "Stories are auto-prioritized. Agents start with auth and database setup, then build your core feature, then handle billing and the landing page.",
      },
      {
        step: 3,
        title: "Review and customize",
        description:
          "Review each completed feature in the deploy preview. Customize the parts that make your product unique. Send feedback to agents for revisions on anything that needs changes.",
      },
      {
        step: 4,
        title: "Deploy and validate",
        description:
          "One-click deploy to your hosting platform. Share with your target audience, collect feedback, and start your next iteration sprint with real data.",
      },
    ],
    testimonialQuote:
      "I had been thinking about my SaaS idea for six months. Saturday morning I described it to Codepylot, set up the stories, and let the agents run. By Sunday evening I had a working MVP with auth, a dashboard, and Stripe billing. I launched on Monday and had my first paying user by Wednesday.",
    testimonialAuthor: "Priya Sharma, founder of MeetingBrief (launched in 3 days)",
    ctaText: "Launch your MVP this weekend",
  },
  {
    slug: "small-teams",
    name: "Small Teams",
    persona: "Small Development Team",
    heroTitle:
      "Codepylot for Small Teams — Multiply Your Engineering Output with AI Agents",
    heroDescription:
      "Your 2-5 person team punches above its weight, but there is never enough time to build everything on the roadmap. Codepylot gives your small team AI-powered leverage — agents handle routine stories while your engineers focus on the complex, high-impact work that requires human creativity.",
    painPoints: [
      "Your team is too small for heavyweight tools like Jira but needs more structure than a shared doc or Trello board",
      "Senior engineers spend too much time on routine CRUD, boilerplate, and repetitive patterns instead of solving hard problems",
      "Sprint planning takes too long and stories are inconsistently written, leading to misunderstandings and rework",
      "You cannot hire more engineers right now, but the feature backlog keeps growing and stakeholders keep asking for more",
    ],
    solutions: [
      {
        title: "Right-sized project management for small teams",
        description:
          "Codepylot's Kanban board has the structure you need — sprints, priorities, story points, dependencies — without the ceremony and configuration overhead of enterprise tools.",
      },
      {
        title: "AI agents as your force multiplier",
        description:
          "Run up to 3 concurrent agents per project. Assign routine stories to agents and complex ones to your engineers. Your 3-person team ships like a team of 6.",
      },
      {
        title: "Consistent, well-written stories every time",
        description:
          "AI rewrites ensure every story has the same structure: clear title, user story format, Given/When/Then acceptance criteria, story points, and priority. No more 'what did you mean by this?'",
      },
      {
        title: "AI standup summaries save meeting time",
        description:
          "Generate a daily standup summary with completed, in-progress, blocked, and needs-review stories. Copy to Slack and skip the 15-minute standup meeting.",
      },
    ],
    features: [
      {
        name: "Multi-Agent Parallelism",
        description:
          "Run up to 3 AI agents simultaneously per project. Assign routine stories to agents while your team tackles the creative, complex work.",
        icon: "Cpu",
      },
      {
        name: "Sprint Management",
        description:
          "Create sprints with goals and date ranges. Track velocity across sprints to forecast delivery dates and manage stakeholder expectations with data.",
        icon: "Calendar",
      },
      {
        name: "Daily Standup Summary",
        description:
          "AI-generated standup with completed, in-progress, blocked, and needs-review stories. Copy to Slack or Discord and reclaim your standup meeting time.",
        icon: "MessageSquare",
      },
      {
        name: "Story Dependencies",
        description:
          "Define blockers between stories so parallel work does not create merge conflicts. Agents respect dependencies automatically.",
        icon: "Link",
      },
      {
        name: "Velocity Analytics",
        description:
          "Burndown charts and velocity tracking across sprints. Know exactly how much your team ships per sprint and plan accordingly.",
        icon: "TrendingUp",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Sprint planning",
        description:
          "The team captures ideas via quick capture throughout the week. During planning, AI rewrites rough ideas into structured stories, the team estimates, and pulls stories into the sprint.",
      },
      {
        step: 2,
        title: "Parallel execution",
        description:
          "Engineers take the complex stories. Routine stories go to the AI agent queue. Three agents work in parallel alongside your human team, tripling throughput.",
      },
      {
        step: 3,
        title: "Async standups",
        description:
          "Generate the daily standup summary, post to Slack, and skip the synchronous meeting. Everyone knows what is happening without the interruption.",
      },
      {
        step: 4,
        title: "Sprint review",
        description:
          "Check velocity analytics, review completed stories, and demo deploy previews. Carry incomplete stories to the next sprint and adjust estimates based on actual data.",
      },
    ],
    testimonialQuote:
      "We are a team of three and our CEO keeps adding to the roadmap. With Codepylot's agents handling the routine work, we actually keep up. Last sprint we shipped 34 story points — our previous best was 21. The velocity charts do not lie.",
    testimonialAuthor: "Alex Rivera, tech lead at GrowthKit (3-person eng team)",
    ctaText: "Give your small team superpowers",
  },
  {
    slug: "startup-founders",
    name: "Startup Founders",
    persona: "Technical Startup Founder",
    heroTitle:
      "Codepylot for Startup Founders — Build Your Product Without Hiring an Army",
    heroDescription:
      "You have product vision, technical skills, and zero time. Codepylot lets you operate like a funded startup with a full engineering team. AI agents write code, you make product decisions, and your burn rate stays at zero until you are ready to scale.",
    painPoints: [
      "You are the CEO, CTO, and entire engineering team — every hour spent coding is an hour not spent on fundraising, sales, or product strategy",
      "Hiring engineers is expensive and slow — you cannot afford a team at pre-seed, but you need to ship fast to prove traction",
      "Investors want to see velocity and shipped features, not a pitch deck about what you plan to build someday",
      "You are building in a competitive market where being first to ship a working product determines who wins",
    ],
    solutions: [
      {
        title: "Ship like a funded startup on a bootstrap budget",
        description:
          "AI agents function as your engineering team. Queue stories, agents build features, you review and ship. Your monthly cost is $19 instead of $15K+ for a junior developer.",
      },
      {
        title: "Focus on product decisions, not implementation",
        description:
          "Your unique advantage is knowing what to build. Let Codepylot handle the how. Spend your time on customer interviews, market analysis, and product strategy.",
      },
      {
        title: "Show investors real velocity",
        description:
          "Sprint analytics show concrete velocity numbers, completed features, and deployment frequency. Walk into investor meetings with metrics, not promises.",
      },
      {
        title: "Move faster than funded competitors",
        description:
          "While your competitors are still hiring and onboarding engineers, you have already shipped and iterated three times. Speed is your competitive advantage.",
      },
    ],
    features: [
      {
        name: "Sprint Analytics",
        description:
          "Velocity charts, burndown tracking, and completion rates. Show investors your shipping cadence with real data from real sprints.",
        icon: "LineChart",
      },
      {
        name: "Pro Plan at $19/month",
        description:
          "Unlimited projects, stories, and agent automation. The entire AI engineering team costs less than a single coffee-meeting lunch.",
        icon: "CreditCard",
      },
      {
        name: "GitHub Integration",
        description:
          "Professional git workflow with feature branches, commit linking, and PR automation. Your codebase looks like it was built by a disciplined team.",
        icon: "GitPullRequest",
      },
      {
        name: "AI Story Rewrite",
        description:
          "Transform your product vision into investor-grade user stories with acceptance criteria. Your backlog becomes a living product spec.",
        icon: "PenTool",
      },
      {
        name: "Deploy Integration",
        description:
          "One-click deploy to Vercel, Railway, or Fly.io. Get features to production in minutes, not days. Show investors a live product, not a demo.",
        icon: "Upload",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Translate vision to roadmap",
        description:
          "Describe your product vision in quick capture. AI splits it into epics and stories with dependencies. You now have a structured roadmap, not a napkin sketch.",
      },
      {
        step: 2,
        title: "Agents build while you sell",
        description:
          "Set stories to TODO and attend your investor meeting or customer call. While you are pitching, agents are building. Come back to completed features.",
      },
      {
        step: 3,
        title: "Review and refine",
        description:
          "Review agent output in Focus Mode. The code is good, but you know your product best — refine the UX, tweak the copy, adjust the flow.",
      },
      {
        step: 4,
        title: "Deploy and demonstrate",
        description:
          "Deploy to production with one click. Share the live URL with investors, early users, and advisors. Iterate based on real feedback, not hypothetical scenarios.",
      },
    ],
    testimonialQuote:
      "I raised my pre-seed round with a live product, not a pitch deck. I told investors I shipped the entire MVP in two weeks as a solo founder. They were impressed until they saw the velocity chart — then they were blown away. Codepylot was my secret weapon.",
    testimonialAuthor: "Kai Nakamura, founder and CEO of Planbase (raised $1.2M pre-seed)",
    ctaText: "Build like a funded startup today",
  },
  {
    slug: "agency-developers",
    name: "Agency Developers",
    persona: "Agency Developer",
    heroTitle:
      "Codepylot for Development Agencies — Scale Client Delivery Without Scaling Headcount",
    heroDescription:
      "Your agency's profitability depends on delivering client projects fast. Codepylot's AI agents handle the repetitive 60% of every project — auth flows, CRUD, forms, dashboards — while your developers focus on the custom 40% that justifies your rates. More projects, same team, higher margins.",
    painPoints: [
      "Every client project requires the same boilerplate setup — auth, database, admin panels, billing — and your senior devs are tired of rebuilding it from scratch",
      "Junior developers need constant code review and hand-holding, slowing down your senior engineers who should be working on billable features",
      "Scope creep and client revisions mean fixed-price projects regularly go over budget and eat into your margins",
      "Scaling the agency means hiring more developers, but good developers are expensive and onboarding takes months",
    ],
    solutions: [
      {
        title: "Boilerplate eliminated from every project",
        description:
          "AI agents build auth pages, CRUD endpoints, admin dashboards, and billing integration from story templates. Your team starts every project at 40% complete on day one.",
      },
      {
        title: "AI code review supports your juniors",
        description:
          "Agent-written code comes pre-reviewed with a quality score. Junior devs learn from the AI feedback and your seniors spend less time on routine code reviews.",
      },
      {
        title: "Scope changes handled in hours, not days",
        description:
          "When a client asks for 'just one more feature,' create a story and assign it to an agent. The change is implemented and in review before the client's next meeting.",
      },
      {
        title: "Scale delivery without scaling payroll",
        description:
          "Each developer on your team is augmented by AI agents that handle routine work. A 5-person agency delivers like a 12-person agency without the overhead.",
      },
    ],
    features: [
      {
        name: "Story Templates",
        description:
          "8 built-in templates for auth pages, CRUD endpoints, landing pages, billing integration, and more. Kickstart every client project with proven patterns.",
        icon: "Copy",
      },
      {
        name: "Multi-Project Dashboard",
        description:
          "See all active client projects from one dashboard. Track sprint progress, agent activity, and deadlines across your entire portfolio.",
        icon: "LayoutDashboard",
      },
      {
        name: "Webhooks",
        description:
          "HMAC-signed outgoing webhooks on story events. Integrate with your agency's Slack, invoicing tools, or client notification systems.",
        icon: "Webhook",
      },
      {
        name: "Team Roles (RBAC)",
        description:
          "Owner, Admin, and Member roles with appropriate permissions. Give clients read-only access to their project board without exposing your other work.",
        icon: "ShieldCheck",
      },
      {
        name: "Parallel Agents",
        description:
          "Three concurrent agents per project means three client projects can have automated work happening simultaneously. Maximize your team's throughput.",
        icon: "Workflow",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Client onboarding",
        description:
          "Create a project for the client. Import their repo if it exists, or start fresh. Use story templates to generate the standard boilerplate stories — auth, admin, billing.",
      },
      {
        step: 2,
        title: "Parallel delivery",
        description:
          "Agents build the boilerplate while your developers start on custom business logic. By the time your devs need the foundation, it is already built and reviewed.",
      },
      {
        step: 3,
        title: "Client previews",
        description:
          "Share deploy preview URLs with the client for each completed feature. Collect feedback in real-time and create new stories for revisions. Keep the client engaged and informed.",
      },
      {
        step: 4,
        title: "Deliver and handoff",
        description:
          "Export the complete story log as a deliverable. Clean git history with feature branches and meaningful commits. Professional handoff that builds client trust and referrals.",
      },
    ],
    testimonialQuote:
      "We used to turn down projects because we did not have the bandwidth. Now we take on 40% more clients with the same team. The agents handle the cookie-cutter stuff — login pages, dashboards, CRUD — and our developers focus on the custom work that makes each client happy. Our margins went from 25% to 45%.",
    testimonialAuthor: "Rachel Mendez, CTO of Bright Digital Agency (8-person team)",
    ctaText: "Scale your agency without hiring",
  },
  {
    slug: "hackathon-teams",
    name: "Hackathon Teams",
    persona: "Hackathon Participant",
    heroTitle:
      "Codepylot for Hackathons — Build a Winning Project in 24-48 Hours",
    heroDescription:
      "Hackathons are won by teams that ship the most impressive working product, not the best slide deck. Codepylot helps your team move from brainstorm to working demo in hours. AI agents handle the boilerplate while your team focuses on the innovative features that win judges over.",
    painPoints: [
      "Half the hackathon is spent on setup, auth, and boilerplate before you can start building the actual idea that makes your project unique",
      "Team coordination breaks down under time pressure — who is working on what, what is done, what is blocking progress",
      "You build an impressive concept but run out of time before it actually works, resulting in a demo that is mostly slides and hand-waving",
      "Merge conflicts and broken builds in the final hours are a hackathon killer — one bad git merge can waste hours of work",
    ],
    solutions: [
      {
        title: "Zero to running app in under an hour",
        description:
          "Use story templates for auth, landing page, and database setup. AI agents build the foundation while your team brainstorms and designs the core feature.",
      },
      {
        title: "Real-time team coordination",
        description:
          "Everyone sees the Kanban board. Stories are assigned, progress is visible, and blockers are obvious. No more 'I thought you were doing that' moments at 3am.",
      },
      {
        title: "Working demo, not a slide deck",
        description:
          "Deploy previews give you a live URL for every completed feature. By demo time, judges are clicking through a real working product, not watching a screen recording.",
      },
      {
        title: "Clean git workflow under pressure",
        description:
          "Agents create proper feature branches with clear naming. Auto-linked commits mean every change is traceable. No more panic merges at 4am.",
      },
    ],
    features: [
      {
        name: "Story Templates",
        description:
          "Pre-built templates for auth pages, CRUD endpoints, and landing pages. Skip the boilerplate and start building your unique idea within the first hour.",
        icon: "Blocks",
      },
      {
        name: "Real-Time Board",
        description:
          "Shared Kanban board where the whole team sees progress. Drag stories between columns as you work. No confusion about who owns what.",
        icon: "Kanban",
      },
      {
        name: "Deploy Previews",
        description:
          "Live preview URLs for completed features. Walk up to the judges and hand them a URL, not a USB stick with a README.",
        icon: "Monitor",
      },
      {
        name: "Agent Speed",
        description:
          "While your designer is finishing mockups, agents are building the API. While you are eating dinner, agents are writing tests. Maximize every hour.",
        icon: "Timer",
      },
      {
        name: "Free Tier",
        description:
          "Start for free with 3 projects and 50 stories. More than enough for a hackathon sprint. No credit card required.",
        icon: "Sparkle",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Hackathon kickoff (Hour 0-1)",
        description:
          "Brainstorm your idea, create a project, and use AI story splitter to break it into 5-8 stories. Assign boilerplate stories to agents immediately.",
      },
      {
        step: 2,
        title: "Parallel building (Hour 1-12)",
        description:
          "Agents build auth, database setup, and standard UI while your team works on the core innovative feature. Merge completed agent work as it finishes.",
      },
      {
        step: 3,
        title: "Integration and polish (Hour 12-20)",
        description:
          "Connect the pieces. Your team integrates the core feature with the agent-built foundation. Use deploy previews to test the full flow end-to-end.",
      },
      {
        step: 4,
        title: "Demo ready (Hour 20-24)",
        description:
          "Deploy to production. Your live URL is your demo. Judges click through a real working product while other teams struggle to get their localhost running on the projector.",
      },
    ],
    testimonialQuote:
      "Our team won first place at HackMIT. While other teams were still setting up their databases at hour 4, we already had auth, a working API, and a deployed frontend. We spent all our time on the AI model integration that wowed the judges. Codepylot was our unfair advantage.",
    testimonialAuthor: "Team NeuralPath, 1st place at HackMIT 2025",
    ctaText: "Win your next hackathon",
  },
  {
    slug: "bootcamp-graduates",
    name: "Bootcamp Graduates",
    persona: "Bootcamp Graduate",
    heroTitle:
      "Codepylot for Bootcamp Graduates — Build Your Portfolio and Land Your First Dev Job",
    heroDescription:
      "You have the skills from bootcamp but need real projects to prove it. Codepylot helps you build impressive portfolio projects faster by structuring your ideas into professional user stories and letting AI agents handle the parts you are still learning. Ship real apps, build confidence, and stand out in interviews.",
    painPoints: [
      "You know the fundamentals but freeze when starting a project from scratch — the blank editor screen is paralyzing without bootcamp structure",
      "Tutorial hell is real — you can follow along but struggle to build something original that demonstrates your abilities to employers",
      "Your portfolio projects look like every other bootcamp grad's because you all built the same todo app and weather dashboard",
      "You do not know professional development workflows — feature branches, code review, sprint planning — and it shows in interviews",
    ],
    solutions: [
      {
        title: "Break the blank screen paralysis",
        description:
          "Describe your project idea in plain English. AI splits it into small, achievable stories with clear acceptance criteria. You always know exactly what to build next.",
      },
      {
        title: "Build original projects, not tutorials",
        description:
          "Start with your own idea — a tool you would actually use. Codepylot structures it into professional stories and agents help with the parts you find challenging while you learn.",
      },
      {
        title: "Learn professional workflows by doing",
        description:
          "Feature branches, code review, sprint planning, story writing — Codepylot teaches you the real development workflow that bootcamps skip but employers expect.",
      },
      {
        title: "AI code review as your mentor",
        description:
          "Every piece of code gets reviewed with scores and specific suggestions. Learn from detailed feedback on your code's architecture, patterns, and edge cases.",
      },
    ],
    features: [
      {
        name: "AI Story Breakdown",
        description:
          "Describe 'I want to build a budget tracker' and AI generates 5 structured stories with acceptance criteria. Your project has a roadmap before you write a line of code.",
        icon: "ListTodo",
      },
      {
        name: "AI Code Review",
        description:
          "Get detailed code review feedback with severity levels, file references, and suggestions. Learn best practices from every review like having a senior dev mentor.",
        icon: "GraduationCap",
      },
      {
        name: "Git Workflow Built-In",
        description:
          "Feature branches auto-created, commits auto-linked, PRs auto-generated. Learn the git workflow employers expect without memorizing commands.",
        icon: "GitMerge",
      },
      {
        name: "Acceptance Criteria",
        description:
          "Every story has Given/When/Then acceptance criteria. Learn to think about edge cases, validation, and user flows — the skills that separate juniors from mids.",
        icon: "CheckCircle",
      },
      {
        name: "Free Tier",
        description:
          "Build up to 3 portfolio projects with 50 stories each for free. More than enough to have an impressive portfolio for job applications.",
        icon: "Heart",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Ideate your portfolio project",
        description:
          "Think of a real problem you want to solve — not another todo app. Type your idea into quick capture: 'A meal planning app that generates grocery lists from recipes.'",
      },
      {
        step: 2,
        title: "AI creates your roadmap",
        description:
          "AI splits your idea into 5-8 stories with professional acceptance criteria. You now have a structured project plan that demonstrates product thinking to employers.",
      },
      {
        step: 3,
        title: "Build with AI support",
        description:
          "Work through stories one at a time. When you get stuck, let the AI agent build a reference implementation you can study and learn from. The code review teaches you what good code looks like.",
      },
      {
        step: 4,
        title: "Ship and showcase",
        description:
          "Deploy your project and add it to your portfolio. In interviews, walk through your sprint board showing how you planned, built, and shipped. Employers love seeing process, not just code.",
      },
    ],
    testimonialQuote:
      "I graduated from a bootcamp three months ago and could not get a single interview. I used Codepylot to build three real portfolio projects with proper git workflows and sprint boards. In my interview at a fintech startup, I showed them my Codepylot board and they said it was the most professional portfolio they had seen from a junior. I got the offer.",
    testimonialAuthor: "Maria Santos, junior developer at FinTrack (hired 8 weeks post-bootcamp)",
    ctaText: "Build your portfolio and get hired",
  },
  {
    slug: "devops-engineers",
    name: "DevOps Engineers",
    persona: "DevOps Engineer",
    heroTitle:
      "Codepylot for DevOps Engineers — Automate Infrastructure Stories and Ship Platform Improvements Faster",
    heroDescription:
      "DevOps work is a never-ending stream of infrastructure improvements, monitoring alerts, and platform requests. Codepylot helps you structure operational tasks into trackable stories, delegate routine automation to AI agents, and finally make your platform work visible to the rest of the organization.",
    painPoints: [
      "Infrastructure work is invisible — you spend weeks improving CI/CD pipelines, monitoring, and deployments but nobody sees the impact because it is not tracked on a board",
      "Toil tasks pile up endlessly — updating configs, writing Dockerfiles, configuring monitoring alerts — consuming time that should go to platform improvements",
      "Incident response and firefighting constantly interrupts planned platform work, and you lose context when you return to your improvement projects",
      "Writing runbooks, documentation, and infrastructure-as-code is tedious but critical — and it always gets deprioritized in favor of urgent requests",
    ],
    solutions: [
      {
        title: "Make platform work visible",
        description:
          "Track every infrastructure improvement, automation task, and platform request as a story on your Kanban board. Show stakeholders the concrete progress your team is making.",
      },
      {
        title: "Delegate toil to AI agents",
        description:
          "Routine tasks like writing Dockerfiles, updating CI configs, creating monitoring dashboards, and writing runbooks are perfect for AI agents. Free your time for architecture decisions.",
      },
      {
        title: "Handle interrupts without losing context",
        description:
          "When incidents pull you away, your board preserves exactly where you left off. Sprint analytics show the impact of interruptions on your planned work.",
      },
      {
        title: "AI generates documentation and runbooks",
        description:
          "Create a story for 'write runbook for database failover procedure' and let the AI agent draft it based on your codebase. Review and refine instead of writing from scratch.",
      },
    ],
    features: [
      {
        name: "Story Types for DevOps",
        description:
          "Chore, docs, and refactor story types with appropriate branch prefixes. Track operational work separately from feature work with proper categorization.",
        icon: "Wrench",
      },
      {
        name: "Recurring Stories",
        description:
          "Schedule repeating tasks — weekly dependency updates, monthly security patches, daily log rotation checks. Never forget routine maintenance again.",
        icon: "RefreshCw",
      },
      {
        name: "Codebase-Aware AI",
        description:
          "AI agents understand your project structure, Dockerfiles, CI configs, and infrastructure code. Generated stories and implementations match your actual setup.",
        icon: "FolderTree",
      },
      {
        name: "Webhook Integration",
        description:
          "HMAC-signed webhooks on story events. Connect to PagerDuty, Slack, or your monitoring stack. Automate status updates when infrastructure stories complete.",
        icon: "Bell",
      },
      {
        name: "Git Diff Viewer",
        description:
          "Built-in diff viewer shows file-by-file changes with line numbers and color coding. Review infrastructure code changes without leaving the board.",
        icon: "FileDiff",
      },
    ],
    workflow: [
      {
        step: 1,
        title: "Capture platform requests",
        description:
          "When developers request infrastructure changes, capture them in quick capture. AI structures vague requests like 'make deploys faster' into specific, actionable stories.",
      },
      {
        step: 2,
        title: "Prioritize and delegate",
        description:
          "Sort stories by impact. Assign routine automation (Dockerfiles, configs, basic scripts) to AI agents. Reserve complex architecture work for yourself.",
      },
      {
        step: 3,
        title: "Schedule recurring maintenance",
        description:
          "Set up recurring stories for dependency updates, security patches, and backup verifications. Codepylot auto-creates them on schedule so nothing falls through the cracks.",
      },
      {
        step: 4,
        title: "Report impact",
        description:
          "Use sprint analytics to show stakeholders what your team delivered. Export completed stories as a report. Make the invisible work of DevOps visible and valued.",
      },
    ],
    testimonialQuote:
      "Our platform team was drowning in toil. Updating Helm charts, writing Terraform modules, creating monitoring dashboards — all necessary, none exciting. Codepylot's agents now handle the routine IaC work while we focus on the service mesh migration. Our SLA improved and our burnout decreased. Best of all, stakeholders finally see what we ship because it is all tracked on the board.",
    testimonialAuthor: "Tom Bergström, platform engineering lead at CloudBase (4-person DevOps team)",
    ctaText: "Make your platform work visible and automated",
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return useCases.find((uc) => uc.slug === slug);
}
