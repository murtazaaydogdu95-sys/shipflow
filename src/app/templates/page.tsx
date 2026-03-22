import type { Metadata } from "next";
import Link from "next/link";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { templates } from "@/data/seo/templates";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as LucideIcons from "lucide-react";

function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as
    | React.ComponentType<{ className?: string }>
    | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

export const metadata: Metadata = {
  title:
    "Free Developer Templates — User Stories, Bug Reports & More | Codepylot",
  description:
    "Free templates for user stories, bug reports, feature requests, and more. Each includes structured acceptance criteria in Given/When/Then format.",
  alternates: {
    canonical: "https://codepylot.io/templates",
  },
  openGraph: {
    title:
      "Free Developer Templates — User Stories, Bug Reports & More",
    description:
      "Free templates for user stories, bug reports, feature requests, and more. Each includes structured acceptance criteria in Given/When/Then format.",
    url: "https://codepylot.io/templates",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Free Developer Templates — User Stories, Bug Reports & More",
    description:
      "Free templates for user stories, bug reports, feature requests, and more. Each includes structured acceptance criteria in Given/When/Then format.",
  },
};

export default function TemplatesIndexPage() {
  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Templates" },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Templates", url: "/templates" },
          ]}
        />

        {/* Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free Developer Templates
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {templates.length} ready-to-use templates for user stories, bug
            reports, feature requests, and more — each with structured acceptance
            criteria.
          </p>
        </header>

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.slug}
              href={`/templates/${template.slug}`}
              className="group rounded-lg border bg-card p-5 space-y-2 transition-colors hover:bg-muted/50"
            >
              <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {template.category}
              </span>
              <h2 className="flex items-center gap-2 font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400">
                <DynamicIcon
                  name={template.icon}
                  className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400"
                />
                {template.name}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {template.description}
              </p>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">
            Use these templates in Codepylot
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
