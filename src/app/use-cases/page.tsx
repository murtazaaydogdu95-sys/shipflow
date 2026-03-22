import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCases } from "@/data/seo/use-cases";

export const metadata: Metadata = {
  title: "Codepylot Use Cases — Built for Every Developer | Codepylot",
  description:
    "See how indie hackers, solo developers, startups, and teams use Codepylot to ship software faster with AI-powered sprint management.",
  alternates: {
    canonical: "https://codepylot.io/use-cases",
  },
  openGraph: {
    title: "Codepylot Use Cases — Built for Every Developer",
    description:
      "See how indie hackers, solo developers, startups, and teams use Codepylot to ship software faster with AI-powered sprint management.",
    url: "https://codepylot.io/use-cases",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codepylot Use Cases — Built for Every Developer",
    description:
      "See how indie hackers, solo developers, startups, and teams use Codepylot to ship software faster with AI-powered sprint management.",
  },
};

export default function UseCasesIndexPage() {
  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Use Cases" },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Use Cases", url: "/use-cases" },
          ]}
        />

        {/* Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for Every Developer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how {useCases.length} different types of builders use
            Codepylot to turn ideas into shipped code.
          </p>
        </header>

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc) => (
            <Link
              key={uc.slug}
              href={`/use-cases/${uc.slug}`}
              className="group rounded-lg border bg-card p-5 space-y-2 transition-colors hover:bg-muted/50"
            >
              <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                For {uc.persona}s
              </span>
              <h2 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                {uc.name}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {uc.heroDescription}
              </p>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">
            Ready to ship faster?
          </h2>
          <p className="text-sm text-muted-foreground">
            Start free with 3 projects, 15 stories, and AI story generation. No
            credit card required.
          </p>
          <Button asChild>
            <Link href="/login">
              Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </SeoPageLayout>
  );
}
