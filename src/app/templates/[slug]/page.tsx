import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Copy, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { templates, getTemplate } from "@/data/seo/templates";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return templates.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tmpl = getTemplate(slug);
  if (!tmpl) return { title: "Template Not Found" };

  return {
    title: `Free ${tmpl.name} Template for Developers — Copy & Use | Codepylot`,
    description: `Free ${tmpl.name.toLowerCase()} template with structured user story, acceptance criteria in Given/When/Then format, and story points. Copy and use instantly.`,
    alternates: {
      canonical: `https://codepylot.io/templates/${slug}`,
    },
    openGraph: {
      title: `Free ${tmpl.name} Template`,
      description: `Free ${tmpl.name.toLowerCase()} template with structured user story and acceptance criteria.`,
      url: `https://codepylot.io/templates/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Free ${tmpl.name} Template — Codepylot`,
      description: `Free ${tmpl.name.toLowerCase()} template with acceptance criteria. Copy and use instantly.`,
    },
  };
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

function CopyButton({ text }: { text: string }) {
  "use client";
  return (
    <TemplateCopyButton text={text} />
  );
}

// Client component for copy functionality
function TemplateCopyButton({ text }: { text: string }) {
  return (
    <button
      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
      onClick={() => navigator.clipboard.writeText(text)}
    >
      <Copy className="h-3 w-3" /> Copy
    </button>
  );
}

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tmpl = getTemplate(slug);
  if (!tmpl) notFound();

  const tc = tmpl.templateContent;

  const markdown = `## ${tc.title}

**User Story:** ${tc.userStory}

**Type:** ${tc.type} | **Priority:** ${tc.priority} | **Story Points:** ${tc.storyPoints}

### Description
${tc.description}

### Acceptance Criteria

${tc.acceptanceCriteria.map((ac) => `- **Given** ${ac.given}\n  **When** ${ac.when}\n  **Then** ${ac.then}`).join("\n\n")}`;

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Templates", href: "/templates" },
            { label: tmpl.name },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Templates", url: "/templates" },
            { name: tmpl.name, url: `/templates/${tmpl.slug}` },
          ]}
        />

        {/* Hero */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <DynamicIcon name={tmpl.icon} className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">{tmpl.category}</span>
              <h1 className="text-2xl font-bold">{tmpl.name} Template</h1>
            </div>
          </div>
          <p className="text-muted-foreground">{tmpl.description}</p>
        </header>

        {/* Template preview */}
        <section className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
            <h2 className="font-semibold text-sm">Template Preview</h2>
            <span className="text-xs text-muted-foreground">Copy and use in your project</span>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{tc.title}</h3>
              <p className="text-sm text-muted-foreground italic">{tc.userStory}</p>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-blue-800 dark:text-blue-200">
                {tc.type}
              </span>
              <span className="rounded-full bg-orange-100 dark:bg-orange-900 px-2.5 py-0.5 text-orange-800 dark:text-orange-200">
                {tc.priority}
              </span>
              <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2.5 py-0.5 text-purple-800 dark:text-purple-200">
                {tc.storyPoints} pts
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Description</h4>
              <div className="text-sm text-muted-foreground whitespace-pre-line">{tc.description}</div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Acceptance Criteria</h4>
              {tc.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium text-green-600 dark:text-green-400">Given</span> {ac.given}</p>
                  <p><span className="font-medium text-blue-600 dark:text-blue-400">When</span> {ac.when}</p>
                  <p><span className="font-medium text-purple-600 dark:text-purple-400">Then</span> {ac.then}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Import directly into Codepylot</h2>
          <p className="text-sm text-muted-foreground">
            Skip the copy-paste. Codepylot has built-in templates you can use with one click, plus AI that generates even richer stories from your ideas.
          </p>
          <Button asChild>
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Other templates */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Other Templates</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates
              .filter((t) => t.slug !== slug)
              .map((t) => (
                <Link
                  key={t.slug}
                  href={`/templates/${t.slug}`}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <DynamicIcon name={t.icon} className="h-4 w-4 text-muted-foreground" />
                  {t.name}
                </Link>
              ))}
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: `How to use the ${tmpl.name} template`,
            description: tmpl.description,
            step: [
              { "@type": "HowToStep", text: "Copy the template above or sign up for Codepylot to use it directly" },
              { "@type": "HowToStep", text: "Customize the title, description, and acceptance criteria for your specific feature" },
              { "@type": "HowToStep", text: "Add the story to your sprint board and assign to an AI agent or developer" },
            ],
          }),
        }}
      />
    </SeoPageLayout>
  );
}
