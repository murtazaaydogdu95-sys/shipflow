import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://codepylot.io";

// Import data lazily to avoid build issues if files don't exist yet
async function getComparisons() {
  try {
    const { comparisons } = await import("@/data/seo/comparisons");
    return comparisons;
  } catch { return []; }
}

async function getUseCases() {
  try {
    const { useCases } = await import("@/data/seo/use-cases");
    return useCases;
  } catch { return []; }
}

async function getIntegrations() {
  try {
    const { integrations } = await import("@/data/seo/integrations");
    return integrations;
  } catch { return []; }
}

async function getTemplates() {
  try {
    const { templates } = await import("@/data/seo/templates");
    return templates;
  } catch { return []; }
}

async function getBestLists() {
  try {
    const { bestLists } = await import("@/data/seo/best");
    return bestLists;
  } catch { return []; }
}

async function getBlogPosts() {
  try {
    const { blogPosts } = await import("@/data/seo/blog-posts");
    return blogPosts;
  } catch { return []; }
}

async function getGlossaryTerms() {
  try {
    const { glossaryTerms } = await import("@/data/seo/glossary");
    return glossaryTerms;
  } catch { return []; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/roadmap`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/use-cases`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/integrations`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/templates`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // Free tools
  const toolPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/tools/user-story-generator`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/tools/acceptance-criteria-generator`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // Programmatic pages
  const [comparisons, useCases, integrations, templates, bestLists, blogPosts, glossaryTerms] = await Promise.all([
    getComparisons(),
    getUseCases(),
    getIntegrations(),
    getTemplates(),
    getBestLists(),
    getBlogPosts(),
    getGlossaryTerms(),
  ]);

  const comparisonPages: MetadataRoute.Sitemap = comparisons.map((c: { slug: string }) => ({
    url: `${BASE_URL}/compare/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const useCasePages: MetadataRoute.Sitemap = useCases.map((u: { slug: string }) => ({
    url: `${BASE_URL}/use-cases/${u.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const integrationPages: MetadataRoute.Sitemap = integrations.map((i: { slug: string }) => ({
    url: `${BASE_URL}/integrations/${i.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const templatePages: MetadataRoute.Sitemap = templates.map((t: { slug: string }) => ({
    url: `${BASE_URL}/templates/${t.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const bestPages: MetadataRoute.Sitemap = bestLists.map((b: { slug: string }) => ({
    url: `${BASE_URL}/best/${b.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((p: { slug: string; updatedAt: string }) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: p.slug ? 0.7 : 0.6,
  }));

  const glossaryPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/glossary`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    ...glossaryTerms.map((g: { slug: string }) => ({
      url: `${BASE_URL}/glossary/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [
    ...staticPages,
    ...toolPages,
    ...comparisonPages,
    ...useCasePages,
    ...integrationPages,
    ...templatePages,
    ...bestPages,
    ...blogPages,
    ...glossaryPages,
  ];
}
