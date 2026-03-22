const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://codepylot.com";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Codepylot",
    url: appUrl,
    logo: `${appUrl}/icons/icon-512.png`,
    sameAs: ["https://github.com/codepylot"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Codepylot",
    url: appUrl,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "AI-powered sprint board that turns your ideas into shipped code. Describe what you want — AI agents write the code for you.",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "For getting started",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "19",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        description: "For serious builders",
      },
      {
        "@type": "Offer",
        name: "Pro Max",
        price: "39",
        priceCurrency: "USD",
        billingIncrement: "P1M",
        description: "For power users & teams",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ArticleSchema({
  title,
  description,
  datePublished,
  dateModified,
  slug,
}: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  slug: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished,
    ...(dateModified && { dateModified }),
    url: `${appUrl}/${slug}`,
    author: {
      "@type": "Organization",
      name: "Codepylot",
      url: appUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Codepylot",
      url: appUrl,
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}/icons/icon-512.png`,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${appUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
