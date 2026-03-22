import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema, FAQSchema } from "@/components/seo/json-ld";
import { glossaryTerms, getGlossaryTerm } from "@/data/seo/glossary";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return glossaryTerms.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return { title: "Term Not Found" };

  return {
    title: `What is ${term.term}? — Definition & Guide | Codepylot`,
    description: term.shortDefinition,
    alternates: {
      canonical: `https://codepylot.io/glossary/${slug}`,
    },
    openGraph: {
      title: `What is ${term.term}? — Definition & Guide | Codepylot`,
      description: term.shortDefinition,
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const paragraphs = term.content
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const relatedTermObjects = glossaryTerms.filter(
    (t) => t.slug !== slug && term.relatedTerms.includes(t.slug)
  );

  const otherTerms = glossaryTerms.filter((t) => t.slug !== slug);

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Glossary", url: "/glossary" },
            { name: term.term, url: `/glossary/${term.slug}` },
          ]}
        />
        <FAQSchema faqs={term.faqs} />

        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Glossary", href: "/glossary" },
            { label: term.term },
          ]}
        />

        {/* Hero */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium">
            <BookOpen className="h-4 w-4" />
            <span>Developer Glossary</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What is {term.term}?
          </h1>
        </header>

        {/* Definition box */}
        <div className="rounded-lg border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/30 px-6 py-5">
          <p className="text-base font-medium leading-relaxed">{term.shortDefinition}</p>
        </div>

        {/* Detailed explanation */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold">{term.term}: In Depth</h2>
          <div className="space-y-4">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Related terms */}
        {relatedTermObjects.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Related Terms</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedTermObjects.map((rt) => (
                <Link
                  key={rt.slug}
                  href={`/glossary/${rt.slug}`}
                  className="group rounded-lg border p-4 hover:bg-muted/50 transition-colors space-y-1"
                >
                  <p className="font-medium text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {rt.term}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {rt.shortDefinition}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related links */}
        {term.relatedLinks.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Related Resources</h2>
            <ul className="space-y-2">
              {term.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">
            Put {term.term} into Practice with Codepylot
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Codepylot turns rough ideas into structured user stories and ships them with
            autonomous AI coding agents. Free plan includes 3 projects and AI story generation.
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
            {term.faqs.map((faq) => (
              <details key={faq.question} className="rounded-lg border p-4">
                <summary className="font-medium cursor-pointer">{faq.question}</summary>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Other terms */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Explore Other Terms</h2>
          <div className="flex flex-wrap gap-2">
            {otherTerms.map((t) => (
              <Link
                key={t.slug}
                href={`/glossary/${t.slug}`}
                className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
              >
                {t.term}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SeoPageLayout>
  );
}
