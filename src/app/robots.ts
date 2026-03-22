import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://codepylot.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/projects/",
          "/admin/",
          "/today/",
          "/onboarding/",
          "/account/",
          "/org/",
          "/billing/",
          "/verify-2fa/",
          "/forgot-password/",
          "/reset-password/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
