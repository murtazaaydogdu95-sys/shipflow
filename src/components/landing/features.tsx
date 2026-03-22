"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Layout,
  Bot,
  Github,
  BarChart3,
  Command,
  Keyboard,
  Link2,
  Paperclip,
  Download,
  Shield,
  Webhook,
  GitCompare,
  Focus,
  Rocket,
  Coffee,
  RefreshCw,
  Smartphone,
  LayoutTemplate,
  Scissors,
} from "lucide-react";

const features = [
  {
    icon: Command,
    title: "Quick Capture",
    description:
      "Press Cmd+K anywhere to jot down a rough idea. No forms, no friction — just type and capture.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-500",
    span: "sm:col-span-1",
  },
  {
    icon: Sparkles,
    title: "AI Story Rewrite",
    description:
      "One click transforms your rough idea into a structured user story with acceptance criteria, story points, and priority. Powered by Anthropic, OpenAI, or Ollama.",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-500",
    span: "sm:col-span-1 lg:col-span-2",
  },
  {
    icon: Bot,
    title: "Agent Automation",
    description:
      "Claude Code agents pick up stories, create branches, write code, and open previews — all autonomously. Review, approve, or revert with one click.",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-500",
    span: "sm:col-span-1 lg:col-span-2",
  },
  {
    icon: Layout,
    title: "Kanban Board",
    description:
      "Drag-and-drop board with Icebox, Backlog, To Do, In Progress, Review, and Done columns. Bulk operations, inline editing, and priority badges.",
    color: "from-blue-500 to-cyan-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    span: "sm:col-span-1",
  },
  {
    icon: Keyboard,
    title: "Keyboard-First",
    description:
      "Navigate the board with arrow keys, open stories with Enter, select with Space, and trigger bulk actions — all without touching the mouse.",
    color: "from-slate-500 to-gray-600",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-500",
    span: "sm:col-span-1",
  },
  {
    icon: Github,
    title: "GitHub Integration",
    description:
      "Import repos, auto-link commits via [CP-XXX] tags, PR auto-comments, webhook-driven status updates, and push/merge from the UI.",
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-500",
    span: "sm:col-span-1",
  },
  {
    icon: Link2,
    title: "Story Dependencies",
    description:
      "Define blockers between stories. Blocked stories are flagged on the board and skipped by agents until their dependencies are resolved.",
    color: "from-red-500 to-orange-600",
    bgColor: "bg-red-500/10",
    textColor: "text-red-500",
    span: "sm:col-span-1",
  },
  {
    icon: Paperclip,
    title: "File Attachments",
    description:
      "Drag-and-drop screenshots, mockups, and files directly onto stories. Keep reference material right where you need it.",
    color: "from-teal-500 to-emerald-600",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-500",
    span: "sm:col-span-1",
  },
  {
    icon: BarChart3,
    title: "Sprint Analytics",
    description:
      "Track velocity, burndown, and completion rates across sprints. See how fast you ship with interactive charts.",
    color: "from-sky-500 to-indigo-600",
    bgColor: "bg-sky-500/10",
    textColor: "text-sky-500",
    span: "sm:col-span-1",
  },
  {
    icon: Download,
    title: "Export & CLI",
    description:
      "Export stories as CSV or JSON. Use the CLI tool to manage stories, update status, and add notes from your terminal.",
    color: "from-cyan-500 to-blue-600",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-500",
    span: "sm:col-span-1",
  },
  {
    icon: Webhook,
    title: "Webhooks & API",
    description:
      "Outgoing webhooks for story events, full REST API with key auth, OpenAPI docs, and an MCP server for Claude Code integration.",
    color: "from-orange-500 to-red-600",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    span: "sm:col-span-1",
  },
  {
    icon: Shield,
    title: "Security & Teams",
    description:
      "Two-factor authentication (TOTP), RBAC roles, audit logs, rate limiting, and multi-org support. Enterprise-ready from day one.",
    color: "from-indigo-500 to-violet-600",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-500",
    span: "sm:col-span-1",
  },
  {
    icon: GitCompare,
    title: "Git Diff Viewer",
    description:
      "Review agent code changes with a built-in diff viewer. File sidebar, line-by-line additions and deletions, collapsible sections.",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-500/10",
    textColor: "text-green-500",
    span: "sm:col-span-1",
  },
  {
    icon: Sparkles,
    title: "AI Code Review",
    description:
      "Automated code review scores your agent's work 0-100. Catches bugs, security issues, and quality problems before you approve.",
    color: "from-yellow-500 to-amber-600",
    bgColor: "bg-yellow-500/10",
    textColor: "text-yellow-500",
    span: "sm:col-span-1",
  },
  {
    icon: Bot,
    title: "Multi-Agent",
    description:
      "Run up to 3 Claude Code agents in parallel. Each picks the highest-priority unblocked story and works independently.",
    color: "from-purple-500 to-fuchsia-600",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-500",
    span: "sm:col-span-1",
  },
  {
    icon: Focus,
    title: "Focus Mode",
    description:
      "Three-panel immersive view with story details, code diff, and agent logs side by side. Navigate stories with arrow keys.",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    span: "sm:col-span-1",
  },
  {
    icon: LayoutTemplate,
    title: "Story Templates",
    description:
      "8 ready-made templates for common stories: auth pages, CRUD endpoints, landing pages, billing integration, and more.",
    color: "from-teal-500 to-cyan-600",
    bgColor: "bg-teal-500/10",
    textColor: "text-teal-500",
    span: "sm:col-span-1",
  },
  {
    icon: Scissors,
    title: "Story Splitting",
    description:
      "AI splits big ideas into 3-5 smaller stories with dependencies. One click creates them all on the board.",
    color: "from-rose-500 to-pink-600",
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-500",
    span: "sm:col-span-1",
  },
  {
    icon: Rocket,
    title: "Deploy Integration",
    description:
      "Deploy story branches to Vercel, Railway, Fly.io, or custom webhooks directly from the story review panel.",
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    span: "sm:col-span-1",
  },
  {
    icon: Coffee,
    title: "Daily Standup",
    description:
      "AI-generated standup summary with completed, in-progress, and blocked stories. Copy to clipboard for Slack or Discord.",
    color: "from-amber-600 to-yellow-600",
    bgColor: "bg-amber-600/10",
    textColor: "text-amber-600",
    span: "sm:col-span-1",
  },
  {
    icon: RefreshCw,
    title: "Recurring Stories",
    description:
      "Schedule repeating stories (daily, weekly, monthly). Perfect for code reviews, deployments, and maintenance chores.",
    color: "from-lime-500 to-green-600",
    bgColor: "bg-lime-500/10",
    textColor: "text-lime-500",
    span: "sm:col-span-1",
  },
  {
    icon: Smartphone,
    title: "Mobile PWA",
    description:
      "Install Codepylot as a native app on your phone. Manage stories, review agent work, and capture ideas on the go.",
    color: "from-cyan-500 to-teal-600",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-500",
    span: "sm:col-span-1",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          <Badge className="mb-4">Features</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything you need to ship faster
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From idea capture to deployed code — Codepylot handles the entire
            workflow so you can focus on building.
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className={`group relative ${feature.span}`}
            >
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1">
                {/* Subtle gradient on hover */}
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]`} />

                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bgColor} ${feature.textColor}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}>
      {children}
    </span>
  );
}
