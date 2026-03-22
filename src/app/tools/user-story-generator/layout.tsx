import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free User Story Generator — Create Structured Stories Instantly | Codepylot",
  description:
    "Generate structured user stories with title, description, acceptance criteria, story points, and priority. Free tool for developers and product managers. No signup required.",
  alternates: {
    canonical: "https://codepylot.io/tools/user-story-generator",
  },
  openGraph: {
    title: "Free User Story Generator",
    description:
      "Turn rough feature ideas into structured user stories with acceptance criteria. Free, no signup required.",
    url: "https://codepylot.io/tools/user-story-generator",
    siteName: "Codepylot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free User Story Generator — Codepylot",
    description:
      "Generate structured user stories with acceptance criteria instantly. Free tool for developers.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
