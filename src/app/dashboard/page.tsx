import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsList } from "@/components/projects/projects-list";
import { Header } from "@/components/layout/header";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get user's current org for scoping + check onboarding
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true, onboardingCompleted: true },
  });

  if (!user?.onboardingCompleted) redirect("/onboarding");

  const projects = await prisma.project.findMany({
    where: user?.currentOrgId
      ? { orgId: user.currentOrgId }
      : { members: { some: { userId: session.user.id } } },
    include: {
      _count: { select: { stories: true, sprints: true } },
      sprints: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <div className="flex-1 p-6 md:p-8">
          <ProjectsList projects={projects} userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
