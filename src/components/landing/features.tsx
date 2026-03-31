"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Layout,
  Bot,
  Shield,
  BarChart3,
  Command,
  Target,
  Network,
  Clock,
  Wallet,
  ShieldCheck,
  UserCheck,
  Plug,
  GitBranch,
  Bell,
  Hash,
  type LucideIcon,
} from "lucide-react";

interface FeatureCategory {
  title: string;
  description: string;
  features: {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
    bgColor: string;
    textColor: string;
  }[];
}

const categories: FeatureCategory[] = [
  {
    title: "AI Agent Workforce",
    description: "Persistent agents that work around the clock",
    features: [
      {
        icon: Bot,
        title: "Persistent Agents with Roles",
        description:
          "Named agents with specialized roles — Coder, Tester, Reviewer, Architect, QA, DevOps, Designer, Pen Tester. Create, pause, resume, or terminate from a management UI.",
        color: "from-emerald-500 to-green-600",
        bgColor: "bg-emerald-500/10",
        textColor: "text-emerald-500",
      },
      {
        icon: Plug,
        title: "Multi-Provider: Bring Your Own AI",
        description:
          "Run agents on Claude, OpenAI, Ollama (local), or any service via HTTP webhook adapters. No vendor lock-in.",
        color: "from-violet-500 to-purple-600",
        bgColor: "bg-violet-500/10",
        textColor: "text-violet-500",
      },
      {
        icon: Clock,
        title: "Heartbeat Scheduling",
        description:
          "Schedule agent wake cycles with cron expressions. Advanced routines with webhook triggers and concurrency policies.",
        color: "from-blue-500 to-cyan-600",
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-500",
      },
      {
        icon: Network,
        title: "Org Chart & Hierarchy",
        description:
          "Visual agent hierarchy with drag-to-rearrange. Define reporting lines and team structure for your AI workforce.",
        color: "from-pink-500 to-rose-600",
        bgColor: "bg-pink-500/10",
        textColor: "text-pink-500",
      },
    ],
  },
  {
    title: "Project Management",
    description: "Plan, track, and ship — all from one board",
    features: [
      {
        icon: Layout,
        title: "Kanban Board",
        description:
          "Drag-and-drop board with Icebox, Backlog, To Do, In Progress, Review, and Done columns. Bulk operations and priority badges.",
        color: "from-blue-500 to-cyan-600",
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-500",
      },
      {
        icon: GitBranch,
        title: "Sub-tasks & Progress",
        description:
          "Break stories into parent/child relationships with automatic progress tracking. See completion at a glance.",
        color: "from-teal-500 to-emerald-600",
        bgColor: "bg-teal-500/10",
        textColor: "text-teal-500",
      },
      {
        icon: BarChart3,
        title: "Sprint Analytics",
        description:
          "Track velocity, burndown, and completion rates across sprints with interactive charts.",
        color: "from-sky-500 to-indigo-600",
        bgColor: "bg-sky-500/10",
        textColor: "text-sky-500",
      },
      {
        icon: Sparkles,
        title: "AI Story Rewriting",
        description:
          "One click transforms rough ideas into structured user stories with acceptance criteria, story points, and priority.",
        color: "from-amber-500 to-orange-600",
        bgColor: "bg-amber-500/10",
        textColor: "text-amber-500",
      },
    ],
  },
  {
    title: "Control & Governance",
    description: "Stay in control of your AI workforce",
    features: [
      {
        icon: ShieldCheck,
        title: "Trust Gate",
        description:
          "Mandatory human code review before AI code merges. Built-in diff viewer detects 7 risk patterns including secrets, XSS, and raw SQL.",
        color: "from-green-500 to-emerald-600",
        bgColor: "bg-green-500/10",
        textColor: "text-green-500",
      },
      {
        icon: Wallet,
        title: "Budget Policies",
        description:
          "Set spending limits per agent, project, or org. Auto-pause when thresholds are hit — no surprise costs.",
        color: "from-orange-500 to-red-600",
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-500",
      },
      {
        icon: UserCheck,
        title: "Approval Workflows",
        description:
          "Agent hiring approvals, budget override approvals, and four-eyes principle for critical actions.",
        color: "from-indigo-500 to-violet-600",
        bgColor: "bg-indigo-500/10",
        textColor: "text-indigo-500",
      },
      {
        icon: Target,
        title: "Goal Alignment",
        description:
          "Hierarchical goals from company mission to team objectives to project tasks. Goals are injected into agent prompts automatically.",
        color: "from-rose-500 to-pink-600",
        bgColor: "bg-rose-500/10",
        textColor: "text-rose-500",
      },
    ],
  },
  {
    title: "Developer Experience",
    description: "Built for the way you work",
    features: [
      {
        icon: Hash,
        title: "Issue Numbering",
        description:
          "Org-level sequential IDs (CP-042) for every story. Reference issues in commits, PRs, and conversations.",
        color: "from-slate-500 to-gray-600",
        bgColor: "bg-slate-500/10",
        textColor: "text-slate-500",
      },
      {
        icon: Command,
        title: "Quick Capture & Routines",
        description:
          "Press Cmd+K to capture ideas instantly. Set up advanced routines with cron and webhook triggers.",
        color: "from-violet-500 to-purple-600",
        bgColor: "bg-violet-500/10",
        textColor: "text-violet-500",
      },
      {
        icon: BarChart3,
        title: "Cost Tracking",
        description:
          "Per-invocation token and cost monitoring across agents, stories, and projects. Full visibility into AI spending.",
        color: "from-cyan-500 to-blue-600",
        bgColor: "bg-cyan-500/10",
        textColor: "text-cyan-500",
      },
      {
        icon: Bell,
        title: "Notification Inbox",
        description:
          "Per-user unread tracking with a notification inbox. Never miss a review request, approval, or agent completion.",
        color: "from-amber-600 to-yellow-600",
        bgColor: "bg-amber-600/10",
        textColor: "text-amber-600",
      },
    ],
  },
  {
    title: "Security & Enterprise",
    description: "Enterprise-ready from day one",
    features: [
      {
        icon: Shield,
        title: "RBAC & 2FA",
        description:
          "Owner, Admin, and Member roles with TOTP two-factor authentication and backup codes. Multi-org support included.",
        color: "from-indigo-500 to-violet-600",
        bgColor: "bg-indigo-500/10",
        textColor: "text-indigo-500",
      },
      {
        icon: Plug,
        title: "Webhooks & API",
        description:
          "Outgoing webhooks with retry, dead letter queue, and SSRF prevention. Full REST API with key authentication.",
        color: "from-orange-500 to-red-600",
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-500",
      },
    ],
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
            From AI agent workforce to budget controls — Codepylot handles the entire
            workflow so you stay in control while shipping faster.
          </p>
        </motion.div>

        <div className="mt-16 space-y-20">
          {categories.map((category, catIdx) => (
            <div key={category.title}>
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {category.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {category.description}
                </p>
              </motion.div>

              <motion.div
                className="grid gap-4 sm:grid-cols-2"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
              >
                {category.features.map((feature) => (
                  <motion.div
                    key={feature.title}
                    variants={item}
                    className="group relative"
                  >
                    <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1">
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]`} />

                      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.bgColor} ${feature.textColor}`}>
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <h4 className="text-lg font-semibold">{feature.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
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
