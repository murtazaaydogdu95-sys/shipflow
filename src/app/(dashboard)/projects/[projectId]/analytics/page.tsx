import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VelocityChart } from "@/components/sprints/velocity-chart";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId: session.user.id } },
    },
  });
  if (!project) redirect("/dashboard");

  const sprints = await prisma.sprint.findMany({
    where: { projectId, status: "COMPLETED" },
    include: {
      stories: {
        select: { storyPoints: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const velocityData = sprints.map((sprint) => ({
    name: sprint.name,
    committed: sprint.stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0),
    completed: sprint.stories
      .filter((s) => s.status === "DONE")
      .reduce((sum, s) => sum + (s.storyPoints || 0), 0),
  }));

  // Story stats
  const storyCounts = await prisma.story.groupBy({
    by: ["status"],
    where: { projectId },
    _count: true,
  });

  const priorityCounts = await prisma.story.groupBy({
    by: ["priority"],
    where: { projectId },
    _count: true,
  });

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your shipping velocity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {storyCounts.map((s) => (
          <div key={s.status} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{s.status.replace("_", " ")}</p>
            <p className="text-2xl font-bold">{s._count}</p>
          </div>
        ))}
      </div>

      <VelocityChart data={velocityData} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Stories by Priority</h2>
        <div className="grid gap-2 md:grid-cols-4">
          {priorityCounts.map((p) => (
            <div key={p.priority} className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium">{p.priority}</p>
              <p className="text-xl font-bold">{p._count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
