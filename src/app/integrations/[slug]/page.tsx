import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Plug } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/json-ld";
import { integrations, getIntegration } from "@/data/seo/integrations";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return integrations.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const integ = getIntegration(slug);
  if (!integ) return { title: "Integration Not Found" };

  return {
    title: `Codepylot + ${integ.name} Integration — Automate Your Dev Workflow`,
    description: `Connect Codepylot with ${integ.name}. ${integ.description}`,
    alternates: {
      canonical: `https://codepylot.io/integrations/${slug}`,
    },
    openGraph: {
      title: `Codepylot + ${integ.name} Integration`,
      description: `Connect Codepylot with ${integ.name}. ${integ.description}`,
      url: `https://codepylot.io/integrations/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Codepylot + ${integ.name} Integration`,
      description: integ.description,
    },
  };
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const integ = getIntegration(slug);
  if (!integ) notFound();

  const faqItems = integ.faq.map((f) => ({ question: f.q, answer: f.a }));

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Integrations", href: "/integrations" },
            { label: integ.name },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Integrations", url: "/integrations" },
            { name: integ.name, url: `/integrations/${integ.slug}` },
          ]}
        />
        <FAQSchema faqs={faqItems} />

        {/* Hero */}
        <header className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: `${integ.logoColor}20` }}>
            <Plug className="h-7 w-7" style={{ color: integ.logoColor }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Codepylot + {integ.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{integ.description}</p>
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {integ.category}
          </span>
        </header>

        {/* What you can automate */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">What You Can Automate</h2>
          <div className="space-y-3">
            {integ.automations.map((auto) => (
              <div key={auto.title} className="rounded-lg border p-4 space-y-1">
                <h3 className="font-medium">{auto.title}</h3>
                <p className="text-sm text-muted-foreground">{auto.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Setup Guide</h2>
          <ol className="space-y-3">
            {integ.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Get started with Codepylot + {integ.name}</h2>
          <p className="text-sm text-muted-foreground">
            Sign up free and connect {integ.name} in your project settings.
          </p>
          <Button asChild>
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="space-y-3">
            {integ.faq.map((faq) => (
              <details key={faq.q} className="rounded-lg border p-4">
                <summary className="font-medium cursor-pointer">{faq.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Other integrations */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Other Integrations</h2>
          <div className="flex flex-wrap gap-2">
            {integrations
              .filter((i) => i.slug !== slug)
              .map((i) => (
                <Link
                  key={i.slug}
                  href={`/integrations/${i.slug}`}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  {i.name}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </SeoPageLayout>
  );
}
