import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { comparisons } from "@/data/seo/comparisons";

export const metadata: Metadata = {
  title:
    "Codepylot vs Competitors — Side-by-Side Comparisons | Codepylot",
  description:
    "Compare Codepylot with Linear, Jira, Asana, Trello, and more. Feature-by-feature comparisons to help you choose the right tool.",
  alternates: {
    canonical: "https://codepylot.io/compare",
  },
  openGraph: {
    title: "Codepylot vs Competitors — Side-by-Side Comparisons",
    description:
      "Compare Codepylot with Linear, Jira, Asana, Trello, and more. Feature-by-feature comparisons to help you choose the right tool.",
    url: "https://codepylot.io/compare",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codepylot vs Competitors — Side-by-Side Comparisons",
    description:
      "Compare Codepylot with Linear, Jira, Asana, Trello, and more. Feature-by-feature comparisons to help you choose the right tool.",
  },
};

export default function ComparisonsIndexPage() {
  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Compare" },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Compare", url: "/compare" },
          ]}
        />

        {/* Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Compare Codepylot with the Alternatives
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {comparisons.length} side-by-side comparisons to help you pick the
            right tool for shipping software faster.
          </p>
        </header>

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((comp) => (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="group rounded-lg border border-l-4 bg-card p-5 space-y-2 transition-colors hover:bg-muted/50"
              style={{ borderLeftColor: comp.logoColor }}
            >
              <h2 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                vs {comp.name}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {comp.tagline}
              </p>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Ready to try Codepylot?</h2>
          <p className="text-sm text-muted-foreground">
            Start free with 3 projects, 15 stories, and AI story generation. No
            credit card required.
          </p>
          <Button asChild>
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </SeoPageLayout>
  );
}
