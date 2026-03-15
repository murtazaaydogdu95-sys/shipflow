"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MoveRight, Sparkles } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";

export function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Ship it.", "Build it.", "Launch it.", "Deploy it.", "Scale it."],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <section className="relative overflow-hidden">
      {/* Dot grid background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:32px_32px] opacity-50" />

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute right-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-chart-1/10 blur-[100px]" />
      </div>

      {/* Fade-out bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center md:pb-28 md:pt-36">
        {/* Launch countdown */}
        <div className="mb-10">
          <CountdownTimer />
        </div>

        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-sm font-medium border border-border/60 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI agents that write code for you
          </Badge>
        </motion.div>

        <motion.h1
          className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          Think it.{" "}
          <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
            &nbsp;
            {titles.map((title, index) => (
              <motion.span
                key={index}
                className="absolute font-extrabold bg-gradient-to-r from-primary via-chart-1 to-primary bg-clip-text text-transparent"
                initial={{ opacity: 0, y: "-100" }}
                transition={{ type: "spring", stiffness: 50 }}
                animate={
                  titleNumber === index
                    ? {
                        y: 0,
                        opacity: 1,
                      }
                    : {
                        y: titleNumber > index ? -150 : 150,
                        opacity: 0,
                      }
                }
              >
                {title}
              </motion.span>
            ))}
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Describe what you want built. AI structures it into stories, agents
          write the code, and you review and ship — all from one board.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Button asChild size="lg" className="h-12 gap-2 px-8 text-base shadow-xl shadow-primary/25 transition-shadow hover:shadow-primary/40">
            <Link href="/login">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
            <a href="#pricing">See Pricing</a>
          </Button>
        </motion.div>

        {/* Floating terminal preview */}
        <motion.div
          className="mx-auto mt-16 max-w-2xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="relative rounded-2xl border border-border/60 bg-card/80 p-1 shadow-2xl shadow-black/10 backdrop-blur-sm dark:shadow-black/30">
            {/* Glow behind card */}
            <div className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent blur-sm" />
            <div className="rounded-xl bg-card p-4 md:p-6">
              {/* Terminal header dots */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">shipflow</span>
              </div>
              {/* Mock content */}
              <div className="space-y-3 font-mono text-xs md:text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground select-none">$</span>
                  <span className="text-foreground">&quot;Add a settings page with profile editing&quot;</span>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  <span className="text-primary">{">"}</span>
                  <span>AI rewriting into structured story...</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 items-center rounded bg-chart-2/20 px-1.5 text-[10px] font-semibold text-chart-2 uppercase">feature</span>
                    <span className="font-semibold text-foreground">SF-042 User Settings Page</span>
                  </div>
                  <div className="text-muted-foreground text-xs">As a user, I want to edit my profile so I can update my name and avatar.</div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>3 pts</span>
                    <span>3 acceptance criteria</span>
                    <span className="text-chart-1">HIGH</span>
                  </div>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  <span className="text-green-500">{">"}</span>
                  <span>Agent picked up SF-042 &middot; branch <span className="text-foreground">feat/SF-042-user-settings</span></span>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  <span className="text-green-500">{">"}</span>
                  <span>Writing code... <span className="text-foreground">3 files changed</span></span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-500">{">"}</span>
                  <span className="text-green-500">Ready for review &middot; Approve or revert with one click</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
