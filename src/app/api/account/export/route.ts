import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support ?meta=true for just user metadata (used by billing page)
  const { searchParams } = new URL(req.url);
  if (searchParams.get("meta") === "true") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, paddleCustomerId: true },
    });
    return NextResponse.json(user);
  }

  // Full data export
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: { select: { provider: true, providerAccountId: true, type: true } },
      projects: {
        include: {
          project: {
            include: {
              stories: {
                include: {
                  acceptanceCriteria: true,
                  labels: { include: { label: true } },
                },
              },
              sprints: true,
              labels: true,
            },
          },
        },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 1000 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    projects: user.projects.map((pm) => {
      // Exclude sensitive fields from export
      const { apiKey, apiKeyHash, apiKeyPrefix, aiApiKey, deployToken, webhookSecret, githubToken, ...safeProject } = pm.project as Record<string, unknown>;
      return { role: pm.role, ...safeProject };
    }),
    activities: user.activities,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="codepylot-data-export.json"`,
    },
  });
}
