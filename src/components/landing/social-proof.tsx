"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const stats = [
  { value: "500+", label: "developers" },
  { value: "10,000+", label: "stories shipped" },
  { value: "4.9/5", label: "rating" },
];

const testimonials = [
  {
    quote:
      "Codepylot replaced my entire project management stack. I describe what I want, and the AI agent builds it. Shipped my MVP in a weekend.",
    name: "Alex Chen",
    role: "Indie Hacker",
  },
  {
    quote:
      "I was skeptical about AI coding agents, but Codepylot actually delivers. The stories it generates are better than what I'd write myself.",
    name: "Sarah Kim",
    role: "Solo Developer",
  },
  {
    quote:
      "We went from idea to production in 3 days instead of 3 weeks. The sprint board + AI agent combo is genuinely a new way to build software.",
    name: "Marcus Johnson",
    role: "Startup CTO",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-amber-400 text-amber-400"
        />
      ))}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function SocialProof() {
  return (
    <section id="social-proof" className="scroll-mt-16 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Section heading */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          <Badge className="mb-4">Social Proof</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Builders who ship faster with Codepylot
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Join hundreds of developers who replaced their project management
            stack with one AI-powered sprint board.
          </p>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Divider */}
        <div className="mx-auto mt-12 h-px max-w-xs bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Testimonial cards */}
        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              className="group relative"
            >
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1">
                {/* Subtle purple gradient on hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]" />

                {/* Quote icon */}
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Quote className="h-4 w-4" />
                </div>

                {/* Star rating */}
                <StarRating />

                {/* Quote text */}
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-6 flex items-center gap-3">
                  {/* Avatar placeholder with initials */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
