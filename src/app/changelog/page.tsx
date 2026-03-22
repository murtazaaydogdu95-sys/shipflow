import type { Metadata } from "next";
import { readFileSync } from "fs";
import path from "path";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { ChangelogContent } from "./changelog-content";

export const metadata: Metadata = {
  title: "Changelog — What's New in Codepylot",
  description:
    "See the latest updates, new features, and improvements to Codepylot. Follow our development progress.",
  alternates: {
    canonical: "https://codepylot.io/changelog",
  },
  openGraph: {
    title: "Codepylot Changelog",
    description: "Latest updates, features, and improvements to Codepylot.",
    url: "https://codepylot.io/changelog",
    siteName: "Codepylot",
  },
};

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  let content = "";
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    content = "# Changelog\n\nNo changelog available.";
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Rocket className="h-5 w-5" />
            Codepylot Changelog
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <ChangelogContent content={content} />
      </main>
    </div>
  );
}
