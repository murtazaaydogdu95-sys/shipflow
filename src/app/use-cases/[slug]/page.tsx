import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { useCases, getUseCase } from "@/data/seo/use-cases";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return useCases.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) return { title: "Use Case Not Found" };

  return {
    title: `${uc.heroTitle} — Codepylot`,
    description: uc.heroDescription,
    alternates: {
      canonical: `https://codepylot.io/use-cases/${slug}`,
    },
    openGraph: {
      title: uc.heroTitle,
      description: uc.heroDescription,
      url: `https://codepylot.io/use-cases/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: uc.heroTitle,
      description: uc.heroDescription,
    },
  };
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
  if (!Icon) return null;
  return <Icon className={className} />;
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uc = getUseCase(slug);
  if (!uc) notFound();

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Use Cases", href: "/use-cases" },
            { label: uc.name },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Use Cases", url: "/use-cases" },
            { name: uc.name, url: `/use-cases/${uc.slug}` },
          ]}
        />

        {/* Hero */}
        <header className="text-center space-y-4">
          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
            For {uc.persona}s
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{uc.heroTitle}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{uc.heroDescription}</p>
          <Button asChild size="lg">
            <Link href="/login">
              {uc.ctaText} <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </header>

        {/* Pain Points */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The {uc.persona} Problem</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {uc.painPoints.map((pain) => (
              <div key={pain} className="flex items-start gap-3 rounded-lg border p-4">
                <span className="text-red-500 text-lg shrink-0">-</span>
                <p className="text-sm text-muted-foreground">{pain}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solutions */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">How Codepylot Solves It</h2>
          <div className="space-y-4">
            {uc.solutions.map((sol) => (
              <div key={sol.title} className="rounded-lg border p-5 space-y-2">
                <h3 className="font-semibold">{sol.title}</h3>
                <p className="text-sm text-muted-foreground">{sol.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Key Features for {uc.persona}s</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uc.features.map((feat) => (
              <div key={feat.name} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900">
                    <DynamicIcon name={feat.icon} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-medium text-sm">{feat.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{feat.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Your Workflow with Codepylot</h2>
          <div className="space-y-4">
            {uc.workflow.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white text-sm font-bold shrink-0">
                  {step.step}
                </div>
                <div className="space-y-1 pt-1">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <div className="rounded-lg border bg-muted/50 p-6 space-y-3">
          <Quote className="h-6 w-6 text-purple-500" />
          <blockquote className="text-lg italic">&ldquo;{uc.testimonialQuote}&rdquo;</blockquote>
          <p className="text-sm text-muted-foreground">— {uc.testimonialAuthor}</p>
        </div>

        {/* Cross-category links */}
        <div className="rounded-lg border p-5 space-y-3">
          <h2 className="text-sm font-semibold">Related Resources</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/tools/user-story-generator" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Free Story Generator
            </Link>
            <Link href="/tools/acceptance-criteria-generator" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              AC Generator
            </Link>
            <Link href="/templates/user-story" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Story Templates
            </Link>
            <Link href="/blog" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Blog
            </Link>
            <Link href="/glossary/acceptance-criteria" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              What are Acceptance Criteria?
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">{uc.ctaText}</h2>
          <p className="text-muted-foreground">
            Free plan includes 3 projects, 15 stories per project, and AI story generation.
          </p>
          <Button asChild size="lg">
            <Link href="/login">
              Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Other use cases */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Other Use Cases</h2>
          <div className="flex flex-wrap gap-2">
            {useCases
              .filter((u) => u.slug !== slug)
              .map((u) => (
                <Link
                  key={u.slug}
                  href={`/use-cases/${u.slug}`}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  {u.name}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </SeoPageLayout>
  );
}
