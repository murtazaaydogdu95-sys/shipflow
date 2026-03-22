import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, X, ArrowRight, Minus } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/json-ld";
import { comparisons, getComparison } from "@/data/seo/comparisons";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comp = getComparison(slug);
  if (!comp) return { title: "Comparison Not Found" };

  return {
    title: `Codepylot vs ${comp.name} — Which Is Better for Developers? (2026)`,
    description: `Compare Codepylot and ${comp.name} side-by-side. Features, pricing, AI capabilities, and which tool ships code faster.`,
    alternates: {
      canonical: `https://codepylot.io/compare/${slug}`,
    },
    openGraph: {
      title: `Codepylot vs ${comp.name}`,
      description: comp.tagline,
      url: `https://codepylot.io/compare/${slug}`,
      images: [
        {
          url: `https://codepylot.io/api/og?title=${encodeURIComponent(`Codepylot vs ${comp.name}`)}&subtitle=${encodeURIComponent(comp.tagline)}&type=compare`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Codepylot vs ${comp.name}`,
      description: `Compare Codepylot and ${comp.name} side-by-side. Features, pricing, AI capabilities.`,
      images: [`https://codepylot.io/api/og?title=${encodeURIComponent(`Codepylot vs ${comp.name}`)}&type=compare`],
    },
  };
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-green-500" />
    ) : (
      <X className="h-5 w-5 text-red-400" />
    );
  }
  return <span className="text-sm">{value}</span>;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = getComparison(slug);
  if (!comp) notFound();

  const faqItems = comp.faq.map((f) => ({ question: f.q, answer: f.a }));

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Compare", href: "/compare" },
            { label: `vs ${comp.name}` },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Compare", url: "/compare" },
            { name: `Codepylot vs ${comp.name}`, url: `/compare/${comp.slug}` },
          ]}
        />
        <FAQSchema faqs={faqItems} />

        {/* Hero */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Codepylot vs {comp.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{comp.tagline}</p>
        </header>

        {/* Quick verdict */}
        <div className="rounded-lg border bg-muted/50 p-6 space-y-2">
          <h2 className="font-semibold text-lg">The Verdict</h2>
          <p className="text-muted-foreground">{comp.verdict}</p>
        </div>

        {/* Feature comparison table */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-purple-600 dark:text-purple-400">
                    Codepylot
                  </th>
                  <th className="text-center py-3 px-4 font-medium" style={{ color: comp.logoColor }}>
                    {comp.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comp.features.map((f, i) => (
                  <tr key={f.name} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="py-3 px-4 font-medium">{f.name}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <FeatureCell value={f.codepylot} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">
                        <FeatureCell value={f.competitor} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pros/Cons */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400">
              Why Choose Codepylot
            </h2>
            <ul className="space-y-2">
              {comp.prosCodepylot.map((pro) => (
                <li key={pro} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold" style={{ color: comp.logoColor }}>
              Why Choose {comp.name}
            </h2>
            <ul className="space-y-2">
              {comp.prosCompetitor.map((pro) => (
                <li key={pro} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-medium text-muted-foreground mt-4">Limitations</h3>
            <ul className="space-y-2">
              {comp.consCompetitor.map((con) => (
                <li key={con} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Minus className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Detailed Comparison</h2>
          <p className="text-muted-foreground leading-relaxed">{comp.description}</p>
        </section>

        {/* Cross-category links */}
        <div className="rounded-lg border p-5 space-y-3">
          <h2 className="text-sm font-semibold">Explore More</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/tools/user-story-generator" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Free Story Generator
            </Link>
            <Link href="/use-cases/indie-hackers" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              For Indie Hackers
            </Link>
            <Link href="/use-cases/solo-developers" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              For Solo Developers
            </Link>
            <Link href="/blog" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Blog
            </Link>
            <Link href="/glossary/kanban-board" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              What is a Kanban Board?
            </Link>
            <Link href="/glossary/ai-coding-agent" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              What is an AI Coding Agent?
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Ready to try Codepylot?</h2>
          <p className="text-sm text-muted-foreground">
            Start free with 3 projects, 15 stories, and AI story generation. No credit card required.
          </p>
          <Button asChild>
            <Link href="/login">
              Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {comp.faq.map((faq) => (
              <details key={faq.q} className="rounded-lg border p-4">
                <summary className="font-medium cursor-pointer">{faq.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Other comparisons */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Other Comparisons</h2>
          <div className="flex flex-wrap gap-2">
            {comparisons
              .filter((c) => c.slug !== slug)
              .slice(0, 8)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  vs {c.name}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </SeoPageLayout>
  );
}
