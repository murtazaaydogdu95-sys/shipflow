import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { SeoPageLayout } from "@/components/seo/seo-page-layout";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { BreadcrumbSchema } from "@/components/seo/json-ld";
import { blogPosts, blogClusters, getPillarPosts } from "@/data/seo/blog-posts";

export const metadata: Metadata = {
  title: "Codepylot Blog — AI Development, Sprint Management & Developer Productivity",
  description:
    "Articles on AI-assisted development, sprint planning for small teams, developer productivity, and shipping software faster.",
  alternates: {
    canonical: "https://codepylot.io/blog",
  },
  openGraph: {
    title: "Codepylot Blog",
    description:
      "Articles on AI-assisted development, sprint planning for small teams, and shipping software faster.",
    url: "https://codepylot.io/blog",
  },
};

export default function BlogIndexPage() {
  const pillars = getPillarPosts();
  const recentPosts = [...blogPosts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <SeoPageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
        <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }]} />

        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
          <p className="text-lg text-muted-foreground">
            Guides on AI-assisted development, sprint management, and shipping software faster.
          </p>
        </div>

        {/* Pillar posts (featured) */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Featured Guides</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-lg border p-5 hover:border-purple-500/50 transition-colors space-y-2"
              >
                <h3 className="font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{post.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.readingTime} min read
                  </span>
                  <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All posts by cluster */}
        {blogClusters.map((cluster) => {
          const clusterPosts = blogPosts.filter((p) => p.cluster === cluster.id && !p.isPillar);
          if (clusterPosts.length === 0) return null;
          return (
            <section key={cluster.id} className="space-y-4">
              <h2 className="text-xl font-semibold">{cluster.name}</h2>
              <p className="text-sm text-muted-foreground">{cluster.description}</p>
              <div className="space-y-3">
                {clusterPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex items-center justify-between rounded-lg border p-4 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.readingTime} min
                        </span>
                        <span>
                          {new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors shrink-0 ml-4" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </SeoPageLayout>
  );
}
