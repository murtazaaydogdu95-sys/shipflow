import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { integrations } from "@/data/seo/integrations";

export const metadata: Metadata = {
  title:
    "Codepylot Integrations — Connect Your Dev Stack | Codepylot",
  description:
    "Integrate Codepylot with GitHub, Claude Code, Vercel, Railway, Slack, and more. Automate your entire development workflow.",
  alternates: {
    canonical: "https://codepylot.io/integrations",
  },
  openGraph: {
    title: "Codepylot Integrations — Connect Your Dev Stack",
    description:
      "Integrate Codepylot with GitHub, Claude Code, Vercel, Railway, Slack, and more. Automate your entire development workflow.",
    url: "https://codepylot.io/integrations",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codepylot Integrations — Connect Your Dev Stack",
    description:
      "Integrate Codepylot with GitHub, Claude Code, Vercel, Railway, Slack, and more. Automate your entire development workflow.",
  },
};

export default function IntegrationsIndexPage() {
  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Integrations" },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Integrations", url: "/integrations" },
          ]}
        />

        {/* Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Integrations
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect Codepylot with your favorite tools and automate your entire
            development workflow.
          </p>
        </header>

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Link
              key={integration.slug}
              href={`/integrations/${integration.slug}`}
              className="group rounded-lg border bg-card p-5 space-y-2 transition-colors hover:bg-muted/50"
            >
              <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {integration.category}
              </span>
              <h2 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                {integration.name}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {integration.description}
              </p>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">
            Ready to connect your stack?
          </h2>
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
