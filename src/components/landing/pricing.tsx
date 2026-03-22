"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For getting started",
    features: [
      "Up to 3 projects",
      "15 stories per project",
      "Kanban board with drag-and-drop",
      "Keyboard shortcuts & bulk ops",
      "4 AI rewrites/month",
      "Story templates (8 built-in)",
      "Natural language commands",
      "Export (CSV & JSON)",
      "Today view & PWA",
      "Story dependencies",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For serious builders",
    features: [
      "Unlimited projects & stories",
      "50 AI rewrites/month",
      "Multi-agent (up to 3 parallel)",
      "AI code review & diff viewer",
      "Focus mode & story splitting",
      "Deploy to Vercel/Railway/Fly",
      "Daily standup summary",
      "Recurring stories",
      "GitHub integration & PR linking",
      "Codebase-aware rewrites",
      "Browser extension",
      "Sprint analytics & burndown",
      "File attachments & webhooks",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Pro Max",
    price: "$39",
    period: "/month",
    description: "For power users & teams",
    features: [
      "Everything in Pro",
      "Unlimited AI rewrites",
      "Up to 5 parallel agents",
      "Priority agent queue",
      "Fastest story processing",
    ],
    cta: "Go Pro Max",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-16 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          <SectionBadge>Pricing</SectionBadge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Start free. Upgrade when you need agent automation and unlimited
            projects.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="relative"
            >
              {/* Glow effect for Pro */}
              {plan.highlighted && (
                <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-primary/10 to-transparent blur-sm" />
              )}

              <div
                className={`relative h-full overflow-hidden rounded-2xl border p-6 md:p-8 ${
                  plan.highlighted
                    ? "border-primary/50 bg-card shadow-2xl shadow-primary/10"
                    : "border-border/60 bg-card"
                }`}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <div className="absolute right-4 top-4">
                    <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full gap-2 ${plan.highlighted ? "shadow-lg shadow-primary/25" : ""}`}
                  variant={plan.highlighted ? "default" : "outline"}
                  size="lg"
                >
                  <Link href="/login">
                    {plan.cta}
                    {plan.highlighted && <ArrowRight className="h-4 w-4" />}
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-flex items-center rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
