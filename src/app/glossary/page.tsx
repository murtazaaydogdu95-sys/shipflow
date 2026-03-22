import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { glossaryTerms } from "@/data/seo/glossary";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Developer Glossary — Agile & AI Development Terms | Codepylot",
  description:
    "Plain-English definitions for the agile and AI development terms every developer should know: user stories, acceptance criteria, story points, kanban boards, vibe coding, and more.",
  alternates: {
    canonical: "https://codepylot.io/glossary",
  },
  openGraph: {
    title: "Developer Glossary — Agile & AI Development Terms | Codepylot",
    description:
      "Plain-English definitions for the agile and AI development terms every developer should know.",
  },
};

export default function GlossaryIndexPage() {
  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Glossary", url: "/glossary" },
          ]}
        />

        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Glossary" },
          ]}
        />

        {/* Hero */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium">
            <BookOpen className="h-4 w-4" />
            <span>Reference</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Developer Glossary
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Plain-English definitions for the agile and AI development terms every developer
            should know — from user stories and story points to vibe coding and AI coding agents.
          </p>
        </header>

        {/* Terms grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            All Terms ({glossaryTerms.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {glossaryTerms.map((term) => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                className="group rounded-lg border p-5 hover:bg-muted/50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {term.term}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {term.shortDefinition}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to put these concepts into practice?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Codepylot brings agile methodology and AI coding agents together. Describe your
            idea, generate structured user stories, and let autonomous agents ship the code.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/tools/user-story-generator">Try the Story Generator</Link>
            </Button>
          </div>
        </div>
      </div>
    </SeoPageLayout>
  );
}
