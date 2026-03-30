import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { ShareButton } from "./share-button";

const COLUMN_ORDER = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

const COLUMN_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const TYPE_COLORS: Record<string, string> = {
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bug: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  chore: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  refactor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  docs: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  test: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { name: true, isPublic: true },
  });

  if (!project || !project.isPublic) {
    return { title: "Not Found" };
  }

  return {
    title: `${project.name} — Public Board`,
    description: `View the public board for ${project.name}`,
  };
}

export default async function PublicBoardPage({ params }: PageProps) {
  const { slug } = await params;

  const project = await prisma.project.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      isPublic: true,
      techStack: true,
    },
  });

  if (!project || !project.isPublic) {
    notFound();
  }

  const stories = await prisma.story.findMany({
    where: { projectId: project.id },
    select: {
      id: true,
      shortId: true,
      title: true,
      status: true,
      type: true,
      priority: true,
      storyPoints: true,
      position: true,
      labels: {
        select: {
          label: { select: { name: true, color: true } },
        },
      },
    },
    orderBy: { position: "asc" },
  });

  const grouped: Record<string, typeof stories> = {};
  for (const s of stories) {
    (grouped[s.status] ||= []).push(s);
  }

  const totalStories = stories.length;
  const doneCount = (grouped["DONE"] || []).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Rocket className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold" data-testid="public-board-title">{project.name}</h1>
              {project.techStack && (
                <p className="text-xs text-muted-foreground">{project.techStack}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalStories} stories</span>
            {totalStories > 0 && (
              <span>{Math.round((doneCount / totalStories) * 100)}% complete</span>
            )}
            <ShareButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((status) => {
            const items = grouped[status] || [];
            return (
              <div
                key={status}
                className="flex flex-col w-64 sm:w-72 min-w-[256px] sm:min-w-[288px] bg-muted/30 rounded-xl shrink-0"
                data-testid={`public-board-column-${status}`}
              >
                <div className="flex items-center gap-2 p-3 pb-2">
                  <h2 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h2>
                  <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
                  {items.map((story) => (
                    <div
                      key={story.id}
                      className="rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{story.title}</p>
                        {story.storyPoints && (
                          <span className="shrink-0 text-xs bg-muted rounded-full px-1.5 py-0.5 font-mono">
                            {story.storyPoints}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          {story.shortId}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            TYPE_COLORS[story.type] || TYPE_COLORS.feature
                          }`}
                        >
                          {story.type}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            PRIORITY_COLORS[story.priority] || PRIORITY_COLORS.MEDIUM
                          }`}
                        >
                          {story.priority.toLowerCase()}
                        </span>
                        {story.labels.map((l) => (
                          <span
                            key={l.label.name}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${l.label.color}20`,
                              color: l.label.color,
                            }}
                          >
                            {l.label.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No stories
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t mt-8">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center space-y-2">
          <p className="text-sm font-medium">Ship features faster with AI agents</p>
          <p className="text-xs text-muted-foreground" data-testid="public-board-signup-cta">
            Powered by <Link href="/" className="underline hover:text-foreground">Codepylot</Link>
            {" — "}
            <Link href="/auth/signin" className="underline hover:text-foreground">Start building your own board</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
