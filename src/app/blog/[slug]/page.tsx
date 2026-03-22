import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/json-ld";
import { blogPosts, getBlogPost, getBlogPostsByCluster, blogClusters } from "@/data/seo/blog-posts";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} — Codepylot Blog`,
    description: post.description,
    alternates: {
      canonical: `https://codepylot.io/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://codepylot.io/blog/${slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: [
        {
          url: `https://codepylot.io/api/og?title=${encodeURIComponent(post.title)}&type=blog`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [`https://codepylot.io/api/og?title=${encodeURIComponent(post.title)}&type=blog`],
    },
  };
}

function renderMarkdown(content: string) {
  // Simple markdown-to-HTML renderer for blog content
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-6 space-y-1 text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  }

  function flushCode() {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      codeLines = [];
    }
    inCodeBlock = false;
  }

  function formatInline(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-purple-600 dark:text-purple-400 underline">$1</a>');
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(line.slice(2));
      continue;
    }

    if (inList && line.trim() === "") {
      flushList();
      continue;
    }

    if (inList && !line.startsWith("- ") && !line.startsWith("* ")) {
      flushList();
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-semibold mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-bold mt-8 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("| ")) {
      // Skip tables for now (handled by the content itself)
      elements.push(
        <p key={`table-${elements.length}`} className="text-sm text-muted-foreground font-mono">
          {line}
        </p>
      );
    } else if (line.trim() === "") {
      // Skip empty lines
    } else {
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  }

  flushList();
  flushCode();

  return elements;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const cluster = blogClusters.find((c) => c.id === post.cluster);
  const relatedPosts = getBlogPostsByCluster(post.cluster).filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <SeoPageLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: post.title },
          ]}
        />
        <BreadcrumbSchema
          items={[
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]}
        />
        <ArticleSchema
          title={post.title}
          description={post.description}
          datePublished={post.publishedAt}
          dateModified={post.updatedAt}
          slug={`blog/${post.slug}`}
        />

        {/* Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {cluster && (
              <span className="rounded-full bg-purple-100 dark:bg-purple-900 px-2.5 py-0.5 text-xs text-purple-800 dark:text-purple-200">
                {cluster.name}
              </span>
            )}
            {post.isPillar && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900 px-2.5 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                Guide
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {post.readingTime} min read
            </span>
            <span>
              Published{" "}
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {post.updatedAt !== post.publishedAt && (
              <span>
                Updated{" "}
                {new Date(post.updatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="space-y-4">{renderMarkdown(post.content)}</div>

        {/* Cross-category links */}
        <div className="rounded-lg border p-5 space-y-3">
          <h2 className="text-sm font-semibold">Explore More</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/tools/user-story-generator" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Free Story Generator
            </Link>
            <Link href="/tools/acceptance-criteria-generator" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              AC Generator
            </Link>
            <Link href="/compare/linear" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Codepylot vs Linear
            </Link>
            <Link href="/compare/jira" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Codepylot vs Jira
            </Link>
            <Link href="/use-cases/indie-hackers" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              For Indie Hackers
            </Link>
            <Link href="/glossary/user-story" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              What is a User Story?
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-lg border bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold">Ready to ship faster?</h2>
          <p className="text-sm text-muted-foreground">
            Codepylot turns your ideas into shipped code with AI-powered story generation and autonomous coding agents.
          </p>
          <Button asChild>
            <Link href="/login">
              Try Codepylot Free <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 border-t pt-8">
            <h2 className="text-xl font-semibold">Related Articles</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group rounded-lg border p-4 hover:border-purple-500/50 transition-colors space-y-1"
                >
                  <h3 className="font-medium text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {related.readingTime} min read
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </SeoPageLayout>
  );
}
