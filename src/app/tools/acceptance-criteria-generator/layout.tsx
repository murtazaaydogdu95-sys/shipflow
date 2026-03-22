import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Acceptance Criteria Generator — Given/When/Then Format | Codepylot",
  description:
    "Generate structured acceptance criteria in Given/When/Then format for any feature. Covers happy path, validation, errors, and edge cases. Free, no signup required.",
  alternates: {
    canonical: "https://codepylot.io/tools/acceptance-criteria-generator",
  },
  openGraph: {
    title: "Free Acceptance Criteria Generator",
    description:
      "Generate Given/When/Then acceptance criteria for any feature. Covers happy path, errors, and edge cases.",
    url: "https://codepylot.io/tools/acceptance-criteria-generator",
    siteName: "Codepylot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Acceptance Criteria Generator — Codepylot",
    description:
      "Generate structured acceptance criteria in Given/When/Then format. Free tool for developers.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
