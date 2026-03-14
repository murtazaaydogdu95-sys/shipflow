import { prisma } from "@/lib/prisma";
import { Rocket } from "lucide-react";
import Link from "next/link";

const STATUS_COLUMNS = [
  { status: "TODO", label: "Planned" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "DONE", label: "Done" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  bug: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  chore: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  refactor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  docs: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  test: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectSlug } = await searchParams;

  const where: Record<string, unknown> = { isPublic: true };
  if (projectSlug) {
    where.slug = projectSlug;
  }

  const projects = await prisma.project.findMany({
    where,
    select: { id: true, name: true, slug: true },
  });

  const projectIds = projects.map((p) => p.id);

  const stories = await prisma.story.findMany({
    where: {
      projectId: { in: projectIds },
      status: { in: ["TODO", "IN_PROGRESS", "DONE"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      type: true,
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Rocket className="h-5 w-5" />
            ShipFlow Roadmap
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No public projects found.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATUS_COLUMNS.map(({ status, label }) => {
              const items = stories.filter((s) => s.status === status);
              return (
                <div key={status}>
                  <h2 className="text-lg font-semibold mb-4">
                    {label}
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {items.map((story) => (
                      <div
                        key={story.id}
                        className="rounded-lg border p-3 bg-card"
                      >
                        <p className="text-sm font-medium">{story.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              TYPE_COLORS[story.type] || TYPE_COLORS.feature
                            }`}
                          >
                            {story.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {story.project.name}
                          </span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No items
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
