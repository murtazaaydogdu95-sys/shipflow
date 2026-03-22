import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Minus, Star, ExternalLink } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { bestLists, getBestList } from "@/data/seo/best";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return bestLists.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = getBestList(slug);
  if (!list) return { title: "List Not Found" };

  return {
    title: list.title,
    description: list.description,
    alternates: {
      canonical: `https://codepylot.io/best/${slug}`,
    },
    openGraph: {
      title: list.title,
      description: list.description,
      url: `https://codepylot.io/best/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: list.title,
      description: list.description,
    },
  };
}

export default async function BestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = getBestList(slug);
  if (!list) notFound();

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Best Tools" },
            { label: list.name },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Best Tools", url: "/best" },
            { name: list.name, url: `/best/${list.slug}` },
          ]}
        />

        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{list.title}</h1>
          <p className="text-lg text-muted-foreground">{list.description}</p>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </header>

        {/* Quick nav */}
        <nav className="rounded-lg border p-4 space-y-2">
          <h2 className="text-sm font-medium">In this article</h2>
          <ol className="space-y-1 text-sm text-muted-foreground">
            {list.tools.map((tool, i) => (
              <li key={tool.name}>
                <a href={`#tool-${i}`} className="hover:text-foreground transition-colors">
                  {i + 1}. {tool.name} {tool.isCodepylot && "★"}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Tool entries */}
        <div className="space-y-8">
          {list.tools.map((tool, i) => (
            <section
              key={tool.name}
              id={`tool-${i}`}
              className={`rounded-lg border p-6 space-y-4 ${
                tool.isCodepylot ? "ring-2 ring-purple-500/30 bg-purple-500/5" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                    <h2 className="text-xl font-bold">{tool.name}</h2>
                    {tool.isCodepylot && (
                      <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
                        Our Pick
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{tool.pricing}</p>
                </div>
              </div>

              <p className="text-muted-foreground">{tool.description}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Pros</h3>
                  <ul className="space-y-1">
                    {tool.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Cons</h3>
                  <ul className="space-y-1">
                    {tool.cons.map((con) => (
                      <li key={con} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Minus className="h-4 w-4 mt-0.5 shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {tool.isCodepylot ? (
                <Button asChild>
                  <Link href="/login">
                    Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Visit {tool.name} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Try Codepylot for free</h2>
          <p className="text-sm text-muted-foreground">
            AI sprint board with autonomous coding agents. From idea to shipped code in minutes.
          </p>
          <Button asChild>
            <Link href="/login">
              Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Other lists */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">More Best-of Lists</h2>
          <div className="flex flex-wrap gap-2">
            {bestLists
              .filter((b) => b.slug !== slug)
              .map((b) => (
                <Link
                  key={b.slug}
                  href={`/best/${b.slug}`}
                  className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  {b.name}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </SeoPageLayout>
  );
}
