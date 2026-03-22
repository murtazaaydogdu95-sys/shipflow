"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <>
      {/* CTA Banner */}
      <section className="relative overflow-hidden border-t">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 to-background" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:24px_24px] opacity-30" />

        <motion.div
          className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to stop writing code yourself?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Describe what you want. Let the AI agent handle the rest.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="h-12 gap-2 px-8 text-base shadow-xl shadow-primary/25">
              <Link href="/login">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            <div className="flex items-center gap-2.5 font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                <Rocket className="h-4 w-4" />
              </div>
              <span>Codepylot</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link href="/tools/user-story-generator" className="transition-colors hover:text-foreground">
                Story Generator
              </Link>
              <Link href="/tools/acceptance-criteria-generator" className="transition-colors hover:text-foreground">
                AC Generator
              </Link>
              <Link href="/blog" className="transition-colors hover:text-foreground">
                Blog
              </Link>
              <Link href="/glossary" className="transition-colors hover:text-foreground">
                Glossary
              </Link>
              <Link href="/roadmap" className="transition-colors hover:text-foreground">
                Roadmap
              </Link>
              <Link href="/changelog" className="transition-colors hover:text-foreground">
                Changelog
              </Link>
              <Link href="/api/docs" className="transition-colors hover:text-foreground">
                API Docs
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Codepylot
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
