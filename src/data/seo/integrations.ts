export type Integration = {
  slug: string;
  name: string;
  description: string;
  logoColor: string;
  category: string;
  setupSteps: string[];
  automations: { title: string; description: string }[];
  faq: { q: string; a: string }[];
};

export const integrations: Integration[] = [
  {
    slug: "github",
    name: "GitHub",
    description:
      "Connect your GitHub repositories to Codepylot for automatic branch creation, commit linking, PR status updates, and webhook-driven story management. Every commit tagged with [SF-XXX] automatically updates your board.",
    logoColor: "#24292f",
    category: "Version Control",
    setupSteps: [
      "Navigate to your project settings in Codepylot and click 'Connect GitHub'.",
      "Authorize the Codepylot GitHub App with access to the repositories you want to manage.",
      "Select the repository to link to your Codepylot project.",
      "Configure the webhook URL provided by Codepylot in your GitHub repository settings (Settings > Webhooks) if not auto-configured by the GitHub App.",
      "Verify the connection by pushing a commit with [SF-001] in the message and confirming the story updates on your board.",
    ],
    automations: [
      {
        title: "Auto-link commits to stories",
        description:
          "Include [SF-XXX] in your commit messages and Codepylot will automatically associate the commit with the corresponding story, showing commit details in the story timeline.",
      },
      {
        title: "Branch creation from stories",
        description:
          "When an agent picks up a story, Codepylot automatically creates a feature branch following your naming convention (e.g., feat/SF-042-add-login-page) and pushes it to GitHub.",
      },
      {
        title: "PR auto-comments with story links",
        description:
          "When a pull request title contains [SF-XXX], Codepylot posts a comment linking back to the story with its description, acceptance criteria, and current status.",
      },
      {
        title: "Webhook-driven story completion",
        description:
          "When a commit with [SF-XXX] is pushed to the main branch, the corresponding story is automatically moved to DONE on your kanban board.",
      },
      {
        title: "Repository import",
        description:
          "Import any GitHub repository into Codepylot to give AI agents full context of your codebase. The repo is cloned and kept in sync for codebase-aware story rewrites and agent work.",
      },
    ],
    faq: [
      {
        q: "Do I need a GitHub App or can I use a personal access token?",
        a: "Codepylot uses GitHub OAuth for authentication and can work with both the GitHub App integration (recommended for teams) and personal access tokens for push operations. The OAuth flow handles repo access permissions automatically.",
      },
      {
        q: "Which GitHub events does Codepylot listen for?",
        a: "Codepylot processes push events (for commit linking and story completion) and pull_request events (for auto-commenting with story links). The webhook handler validates payloads using HMAC-SHA256 signatures.",
      },
      {
        q: "Can I use Codepylot with GitHub Enterprise?",
        a: "Currently Codepylot supports GitHub.com. GitHub Enterprise Server support is on the roadmap. If you're using GitHub Enterprise Cloud, it works out of the box since it uses the same API.",
      },
      {
        q: "What happens if I disconnect a repository?",
        a: "Your stories and history remain intact. Only the live connection is removed, so new commits won't trigger updates. You can reconnect at any time without losing data.",
      },
    ],
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    description:
      "Codepylot's autonomous coding agents are powered by Claude Code. Agents pick up stories from your board, write implementation code, create branches, and open dev previews -- all without human intervention. Configure up to 3 concurrent agents per project.",
    logoColor: "#d97757",
    category: "AI Coding Agent",
    setupSteps: [
      "Set your Anthropic API key in Codepylot project settings under the 'Agent Configuration' section.",
      "Configure the working directory for your project (the local path or Docker volume where your codebase lives).",
      "Set the maximum number of concurrent agents (1-3) based on your workload and API budget.",
      "Enable 'Auto-assign' to let agents automatically pick up TODO stories in priority order.",
      "Optionally configure the MCP server for bidirectional communication between Claude Code and your Codepylot board.",
    ],
    automations: [
      {
        title: "Autonomous story implementation",
        description:
          "Claude Code agents pick up the highest-priority unblocked TODO story, create a feature branch, implement the code, and move the story to REVIEW -- all autonomously.",
      },
      {
        title: "Dependency-aware queue",
        description:
          "The agent queue respects story dependencies. If a story is blocked by an unfinished dependency, the agent skips it and moves to the next available story in priority order.",
      },
      {
        title: "AI code review on completion",
        description:
          "When an agent finishes implementing a story, Codepylot automatically triggers an AI code review that scores the output 0-100 with issue-by-issue breakdown including severity, file, line number, and suggestions.",
      },
      {
        title: "Dev preview auto-start",
        description:
          "After an agent completes a story, Codepylot automatically starts a dev server on a free port so you can preview the changes immediately through the built-in proxy without any manual setup.",
      },
      {
        title: "MCP-powered agent communication",
        description:
          "Agents use the Model Context Protocol to read story details, update status, add progress notes, and mark stories as complete -- all through structured tool calls rather than brittle text parsing.",
      },
    ],
    faq: [
      {
        q: "How much does it cost to run Claude Code agents?",
        a: "Claude Code agent costs depend on your Anthropic API usage. A typical story implementation uses roughly $0.50-$3.00 in API credits depending on complexity. Codepylot itself charges no additional per-agent fees on the Pro plan.",
      },
      {
        q: "Can I review agent code before it's merged?",
        a: "Absolutely. Agent code lands in a feature branch and the story moves to REVIEW status. You can view the full diff, AI code review scores, and dev preview in the story detail modal. Approve to merge, request changes to re-trigger the agent, or revert to discard the work entirely.",
      },
      {
        q: "What happens if an agent gets stuck?",
        a: "Codepylot monitors agent health with a 30-minute timeout. If an agent exceeds this limit, the cleanup cron job automatically marks it as FAILED so the story can be retried. You can also manually revert and re-trigger agents.",
      },
      {
        q: "Does the agent have access to my entire codebase?",
        a: "Yes, the agent runs Claude Code in the project working directory you configure. It has full read/write access to the codebase, which is essential for making meaningful code changes. The agent operates in its own branch, so your main branch is never directly modified.",
      },
    ],
  },
  {
    slug: "vercel",
    name: "Vercel",
    description:
      "Deploy story branches to Vercel directly from Codepylot's review panel. Get instant preview deployments for every story an agent completes, making it easy to review changes in a production-like environment before merging.",
    logoColor: "#000000",
    category: "Deployment",
    setupSteps: [
      "Go to your Codepylot project settings and navigate to the 'Deploy' section.",
      "Select 'Vercel' as your deployment provider.",
      "Enter your Vercel project ID and team ID (found in your Vercel project settings).",
      "Add your Vercel API token (generate one at vercel.com/account/tokens) for authentication.",
      "Test the connection by deploying a story branch from the review panel.",
    ],
    automations: [
      {
        title: "One-click story deployment",
        description:
          "From any story in REVIEW status, click the Deploy button to push the story branch to Vercel. Codepylot tracks the deployment status and links the preview URL directly in the story.",
      },
      {
        title: "Preview URL in story details",
        description:
          "After deployment, the Vercel preview URL is automatically added to the story details so reviewers can test changes in a production-like environment without running anything locally.",
      },
      {
        title: "Deployment status tracking",
        description:
          "Codepylot monitors the Vercel deployment status and displays it in the story review panel. You can see if the build succeeded, failed, or is still in progress.",
      },
    ],
    faq: [
      {
        q: "Do I need a paid Vercel plan?",
        a: "No, Vercel's free Hobby plan supports preview deployments. However, for team collaboration features and more concurrent builds, a Pro plan is recommended.",
      },
      {
        q: "Can I deploy to production from Codepylot?",
        a: "Codepylot focuses on preview deployments for story branches. Production deployments should happen through your normal CI/CD pipeline when the story branch is merged to main.",
      },
      {
        q: "Does it work with monorepos?",
        a: "Yes, as long as your Vercel project is configured to handle monorepos (with a root directory setting or a framework preset), Codepylot's deployment trigger will work correctly.",
      },
    ],
  },
  {
    slug: "railway",
    name: "Railway",
    description:
      "Deploy agent-built story branches to Railway for full-stack preview environments. Railway supports databases, background workers, and any Docker-based service, making it ideal for testing backend changes that need infrastructure.",
    logoColor: "#0B0D0E",
    category: "Deployment",
    setupSteps: [
      "Go to your Codepylot project settings and navigate to the 'Deploy' section.",
      "Select 'Railway' as your deployment provider.",
      "Enter your Railway project ID and environment ID from your Railway dashboard.",
      "Add your Railway API token (generate one at railway.app/account/tokens).",
      "Configure any required environment variables that Railway needs for your preview deployments.",
    ],
    automations: [
      {
        title: "Full-stack preview environments",
        description:
          "Deploy story branches to Railway to get complete preview environments including databases, Redis instances, and background workers -- not just a static frontend preview.",
      },
      {
        title: "One-click deploy from review panel",
        description:
          "Click Deploy on any story in REVIEW status to trigger a Railway deployment. Codepylot passes the branch reference and tracks deployment progress in real time.",
      },
      {
        title: "Environment variable management",
        description:
          "Configure Railway environment variables in Codepylot project settings so preview deployments automatically get the correct configuration without manual setup each time.",
      },
    ],
    faq: [
      {
        q: "Does Railway charge per preview deployment?",
        a: "Railway charges based on resource usage (CPU, memory, network). Preview deployments only cost money while they are running. Codepylot does not add any additional deployment charges.",
      },
      {
        q: "Can I use Railway for both frontend and backend?",
        a: "Yes, Railway is excellent for full-stack deployments. You can deploy Next.js apps, standalone APIs, databases, and workers all in one project. This makes it ideal for testing stories that involve backend changes.",
      },
      {
        q: "How do I tear down preview environments?",
        a: "Preview environments on Railway can be configured to auto-sleep after inactivity. You can also manually stop them from the Railway dashboard or configure Codepylot to clean up deployments when a story moves to DONE.",
      },
    ],
  },
  {
    slug: "fly-io",
    name: "Fly.io",
    description:
      "Deploy story branches to Fly.io for globally distributed preview environments. Ideal for testing latency-sensitive features and full-stack applications that need to run close to your users.",
    logoColor: "#7B3BE2",
    category: "Deployment",
    setupSteps: [
      "Go to your Codepylot project settings and navigate to the 'Deploy' section.",
      "Select 'Fly.io' as your deployment provider.",
      "Enter your Fly.io app name and organization slug from your Fly.io dashboard.",
      "Add your Fly.io API token (generate one with `fly tokens create deploy -x 999999h`).",
      "Ensure your project has a fly.toml or Dockerfile that Fly.io can use to build and deploy.",
    ],
    automations: [
      {
        title: "Edge-deployed previews",
        description:
          "Deploy story branches to Fly.io's global edge network so reviewers can test changes with production-like latency from anywhere in the world.",
      },
      {
        title: "Docker-based deployments",
        description:
          "Fly.io builds and deploys from your Dockerfile, so any application that runs in Docker can be previewed -- including apps with custom system dependencies or complex build steps.",
      },
      {
        title: "Deploy tracking in story timeline",
        description:
          "Codepylot records deployment status, preview URLs, and deployment logs in the story timeline so the entire review process is documented in one place.",
      },
    ],
    faq: [
      {
        q: "Do I need a Fly.io paid plan?",
        a: "Fly.io offers a generous free tier with 3 shared VMs. For preview deployments, this is usually sufficient. You only pay for additional resources or if you need more concurrent preview environments.",
      },
      {
        q: "Can I deploy multi-service applications?",
        a: "Fly.io supports multi-process apps through the fly.toml configuration. For complex multi-service setups, you may want to use Railway instead which has better native multi-service support.",
      },
      {
        q: "How does Fly.io compare to Vercel for previews?",
        a: "Vercel excels at frontend and serverless deployments. Fly.io is better when you need persistent processes, WebSocket support, or custom Docker environments. Choose based on your application's needs.",
      },
    ],
  },
  {
    slug: "slack",
    name: "Slack",
    description:
      "Get real-time Codepylot notifications in your Slack channels. Receive alerts when stories move between columns, agents complete work, code reviews finish, and deployments go live. Keep your entire team in the loop without leaving Slack.",
    logoColor: "#4A154B",
    category: "Communication",
    setupSteps: [
      "Go to your Codepylot project settings and navigate to the 'Webhooks' section.",
      "Click 'Add Webhook' and select the events you want to be notified about (story created, moved, agent completed, etc.).",
      "In Slack, create an Incoming Webhook for your desired channel (Slack App settings > Incoming Webhooks > Add New Webhook).",
      "Copy the Slack webhook URL and paste it as the webhook endpoint in Codepylot.",
      "Send a test event to verify messages are appearing in your Slack channel.",
    ],
    automations: [
      {
        title: "Story status change notifications",
        description:
          "Get a Slack message every time a story moves between columns on your board. See who moved it, the new status, and a link back to the story in Codepylot.",
      },
      {
        title: "Agent completion alerts",
        description:
          "Receive a notification when a Claude Code agent finishes implementing a story, including the AI code review score, number of files changed, and a direct link to review the diff.",
      },
      {
        title: "Daily standup summary",
        description:
          "Use Codepylot's AI-generated daily standup summary and post it to your team's Slack channel. Includes completed, in-progress, blocked, and needs-review stories.",
      },
      {
        title: "New story alerts",
        description:
          "Get notified when new stories are created on the board so the whole team stays aware of incoming work without checking the board constantly.",
      },
    ],
    faq: [
      {
        q: "Can I choose which events trigger Slack notifications?",
        a: "Yes, Codepylot's outgoing webhooks are event-configurable. You can select from story created, story moved, story updated, and agent completed events. Each webhook endpoint can have a different set of events.",
      },
      {
        q: "Is there a native Slack app or does it use webhooks?",
        a: "Currently Codepylot uses Slack Incoming Webhooks, which are simple to set up and don't require installing a Slack app. A native Slack app with richer interactions (like approving stories from Slack) is on the roadmap.",
      },
      {
        q: "Can I send notifications to different channels for different events?",
        a: "Yes, create multiple webhooks in Codepylot, each pointing to a different Slack channel webhook URL with different event filters. For example, agent completions could go to #dev-reviews while new stories go to #product.",
      },
    ],
  },
  {
    slug: "discord",
    name: "Discord",
    description:
      "Pipe Codepylot events into your Discord server for real-time sprint visibility. Ideal for indie hackers, open-source teams, and developer communities who collaborate on Discord instead of Slack.",
    logoColor: "#5865F2",
    category: "Communication",
    setupSteps: [
      "In Discord, go to your server's channel settings and select 'Integrations' > 'Webhooks' > 'New Webhook'.",
      "Name the webhook (e.g., 'Codepylot') and select the channel where notifications should appear.",
      "Copy the Discord webhook URL.",
      "In Codepylot, go to project settings > Webhooks > Add Webhook and paste the Discord webhook URL.",
      "Select the events you want to notify on and save. Discord webhooks accept the same JSON payload format that Codepylot sends.",
    ],
    automations: [
      {
        title: "Board activity feed",
        description:
          "Stream all board activity (story creation, status changes, agent triggers) into a dedicated Discord channel for full transparency with your team or community.",
      },
      {
        title: "Agent progress notifications",
        description:
          "Get Discord messages when agents start working on stories and when they complete, including a summary of changes made and the AI review score.",
      },
      {
        title: "Review request pings",
        description:
          "When a story moves to REVIEW status, post a notification to Discord so team members know there's code waiting for their review.",
      },
    ],
    faq: [
      {
        q: "Do Discord webhooks work the same as Slack webhooks?",
        a: "Discord webhooks accept JSON payloads similar to Slack but with a slightly different format. Codepylot's outgoing webhooks send a standard JSON payload that works with Discord's webhook endpoint. The payload includes an embeds-compatible structure.",
      },
      {
        q: "Can I use Discord threads for story discussions?",
        a: "Not natively yet. The current integration posts messages to a channel. Thread-based discussions tied to specific stories would require a Discord bot, which is planned for a future release.",
      },
      {
        q: "Is there rate limiting I should worry about?",
        a: "Discord webhooks have a rate limit of 30 requests per minute per channel. Codepylot batches webhook deliveries and retries with exponential backoff, so you shouldn't hit limits under normal usage.",
      },
    ],
  },
  {
    slug: "vscode",
    name: "VS Code",
    description:
      "Access your Codepylot board directly from VS Code using the MCP server integration. View stories, update status, and let Claude Code agents work on your project without leaving your editor.",
    logoColor: "#007ACC",
    category: "Editor",
    setupSteps: [
      "Install the Claude Code extension for VS Code (or use the Claude Code CLI).",
      "Build the Codepylot MCP server: `cd packages/mcp-server && npm install && npm run build`.",
      "Add the MCP server configuration to your VS Code Claude settings (or .claude/mcp.json) with your Codepylot API URL, API key, and project ID.",
      "Restart VS Code to load the MCP server connection.",
      "Test the integration by asking Claude to 'list stories' -- it should return your board's stories.",
    ],
    automations: [
      {
        title: "View and manage stories from your editor",
        description:
          "Ask Claude Code to list stories, view story details, update status, or add notes -- all through natural language commands in your editor without switching to the browser.",
      },
      {
        title: "Context-aware story implementation",
        description:
          "Claude Code agents working through VS Code have full access to your open files and editor context, plus your Codepylot stories via MCP, enabling richer implementation with better context.",
      },
      {
        title: "Story completion from terminal",
        description:
          "After implementing a feature, use the MCP tools to mark stories as complete with a commit hash and summary directly from your VS Code terminal.",
      },
      {
        title: "Progress notes while coding",
        description:
          "Add progress notes to stories as you work using MCP tools. Document decisions, blockers, or questions without leaving your coding flow.",
      },
    ],
    faq: [
      {
        q: "Does this require a specific VS Code extension?",
        a: "You need the Claude Code extension (or Cline/Continue with MCP support) installed in VS Code. The Codepylot MCP server is a standard Model Context Protocol server that works with any MCP-compatible client.",
      },
      {
        q: "Can I trigger agents from VS Code?",
        a: "The MCP server provides read/write access to stories, including updating status. While you can move stories to trigger agent runs, the agent spawning itself happens on the Codepylot server side based on your project's auto-assign configuration.",
      },
      {
        q: "What MCP tools are available?",
        a: "The MCP server exposes: list_stories, get_story, get_next_story, update_story_status, complete_story, and add_note. These cover the full lifecycle of working with stories from your editor.",
      },
    ],
  },
  {
    slug: "docker",
    name: "Docker",
    description:
      "Run the entire Codepylot stack locally with Docker Compose in one command. PostgreSQL, Ollama for local AI, and the Codepylot app are all containerized with persistent volumes for data, models, and cloned repositories.",
    logoColor: "#2496ED",
    category: "Infrastructure",
    setupSteps: [
      "Clone the Codepylot repository: `git clone https://github.com/codepylot/codepylot.git`.",
      "Copy the environment file: `cp .env.example .env` and fill in your GitHub OAuth credentials and other optional settings.",
      "Run `docker compose up --build` to start PostgreSQL, Ollama, and Codepylot.",
      "Wait for the initial build to complete and the Ollama model to download (first run only).",
      "Open http://localhost:3000 in your browser to access your self-hosted Codepylot instance.",
    ],
    automations: [
      {
        title: "One-command full stack setup",
        description:
          "A single `docker compose up --build` starts PostgreSQL (with persistent data), Ollama (with model caching), and Codepylot (with auto-migration). No manual database setup or dependency installation required.",
      },
      {
        title: "Automatic database migration",
        description:
          "The Docker entrypoint script automatically runs `prisma db push` on startup, ensuring your database schema is always up to date without manual intervention.",
      },
      {
        title: "Persistent volumes for all data",
        description:
          "Docker volumes persist PostgreSQL data, Ollama models, and cloned GitHub repositories across container restarts. Use `docker compose down -v` only when you want a complete clean slate.",
      },
      {
        title: "Production deployment with GHCR",
        description:
          "For production, use docker-compose.prod.yml which pulls pre-built images from GitHub Container Registry instead of building locally. Designed for VPS deployment behind a reverse proxy.",
      },
    ],
    faq: [
      {
        q: "How much disk space does the Docker setup need?",
        a: "The base images and build artifacts need about 2-3 GB. Ollama models add 2-4 GB depending on the model. PostgreSQL data and cloned repos vary by usage. Plan for at least 10 GB total.",
      },
      {
        q: "Can I run only PostgreSQL in Docker and the app locally?",
        a: "Yes, use `docker compose up postgres -d` to start only the database. Then run `npm run dev` locally for faster development iteration with hot reload. This is the recommended setup for active development.",
      },
      {
        q: "How do I update to a new version?",
        a: "Pull the latest code, then run `docker compose up --build` again. The entrypoint script handles schema updates automatically. Your data persists in Docker volumes across rebuilds.",
      },
      {
        q: "Does the Docker setup work on Apple Silicon (M1/M2/M3)?",
        a: "Yes, all images used in the Docker Compose setup support arm64 architecture. Ollama and PostgreSQL both have native ARM images, and the Codepylot Dockerfile uses multi-platform Node.js base images.",
      },
    ],
  },
  {
    slug: "ollama",
    name: "Ollama",
    description:
      "Run AI story rewrites completely offline using Ollama's local language models. Codepylot integrates with Ollama as an alternative to Anthropic's API, giving you free, private, unlimited AI-powered story generation without sending data to external services.",
    logoColor: "#1A1A2E",
    category: "AI Provider",
    setupSteps: [
      "Install Ollama on your machine: visit ollama.ai and download the installer for your OS, or use `brew install ollama` on macOS.",
      "Pull a recommended model: `ollama pull llama3.2` (or any OpenAI-compatible chat model).",
      "Start Ollama: `ollama serve` (it runs on port 11434 by default).",
      "In Codepylot project settings, set the AI provider to 'Ollama' and configure the URL as `http://localhost:11434/v1` (or `http://ollama:11434/v1` if using Docker Compose).",
      "Test by creating a story in Quick Capture and clicking 'Rewrite with AI' to verify the local model generates structured stories.",
    ],
    automations: [
      {
        title: "Offline AI story rewrite",
        description:
          "Transform rough ideas into structured user stories with title, description, acceptance criteria, story points, and priority -- all running locally on your machine with zero API costs.",
      },
      {
        title: "Codebase-aware rewrites",
        description:
          "Codepylot includes your project's file structure and dependencies when sending context to Ollama, so the local model generates stories that are aware of your tech stack and existing code.",
      },
      {
        title: "AI story splitting",
        description:
          "Split large stories into 3-5 smaller, implementable stories using your local Ollama model. Each sub-story gets proper acceptance criteria and inter-story dependencies.",
      },
      {
        title: "Private and unlimited",
        description:
          "All AI processing happens on your local machine. No data is sent to external APIs, making Ollama ideal for proprietary codebases, air-gapped environments, or teams that want unlimited rewrites without API costs.",
      },
    ],
    faq: [
      {
        q: "Which Ollama models work best with Codepylot?",
        a: "We recommend llama3.2 (8B) for a good balance of quality and speed. For better results on complex stories, try llama3.1 (70B) if your hardware supports it. Any model that supports the OpenAI-compatible chat completions API will work.",
      },
      {
        q: "How does the quality compare to Anthropic's Claude?",
        a: "Claude generally produces higher-quality story rewrites, especially for complex technical stories. Local models like Llama 3.2 are good for straightforward stories and offer the advantage of being free, offline, and unlimited.",
      },
      {
        q: "Can I use Ollama for the coding agents too?",
        a: "The autonomous coding agents require Claude Code specifically, as they rely on the Claude Code CLI and MCP integration. Ollama is used for story rewriting, splitting, and standup summaries.",
      },
      {
        q: "What hardware do I need to run Ollama?",
        a: "For the 8B parameter models (llama3.2), you need at least 8 GB RAM and a modern CPU. For larger models (70B), a GPU with 48+ GB VRAM or 64+ GB system RAM is recommended. Apple Silicon Macs with unified memory work well.",
      },
    ],
  },
];

export function getIntegration(slug: string): Integration | undefined {
  return integrations.find((i) => i.slug === slug);
}
