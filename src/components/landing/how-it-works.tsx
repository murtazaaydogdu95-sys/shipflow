"use client";

import { motion } from "framer-motion";
import { Lightbulb, Sparkles, Layout, Rocket, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Capture an Idea",
    description: "Open Quick Capture (Cmd+K) and type a rough idea — no structure needed.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Sparkles,
    title: "AI Structures It",
    description:
      "AI rewrites your idea into a user story with acceptance criteria, story points, and priority.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Layout,
    title: "Plan on the Board",
    description:
      "Drag stories across your Kanban board. Set dependencies, attach files, assign sprints, and prioritize.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Rocket,
    title: "Agent Ships It",
    description:
      "Claude Code picks up the story, creates a branch, writes the code, and opens a live preview.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: CheckCircle2,
    title: "Review & Approve",
    description:
      "Review the agent's work, approve to merge, or revert and re-trigger. Ship with confidence.",
    color: "from-pink-500 to-rose-500",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-16 overflow-hidden py-24 md:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-muted/30" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:24px_24px] opacity-30" />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          <SectionBadge>How it works</SectionBadge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            From idea to shipped code
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Five steps. No prompt engineering. No boilerplate.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-16"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {/* Connecting line — desktop */}
          <div className="absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <motion.div key={step.title} variants={item} className="relative text-center">
                {/* Step number circle */}
                <div className="relative mx-auto mb-6">
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white text-lg font-bold shadow-lg`}>
                    {i + 1}
                  </div>
                </div>

                {/* Icon */}
                <div className="mb-3 flex justify-center">
                  <step.icon className="h-5 w-5 text-muted-foreground" />
                </div>

                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
