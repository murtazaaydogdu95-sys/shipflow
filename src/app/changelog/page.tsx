import { readFileSync } from "fs";
import path from "path";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { ChangelogContent } from "./changelog-content";

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
            ShipFlow Changelog
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <ChangelogContent content={content} />
      </main>
    </div>
  );
}
