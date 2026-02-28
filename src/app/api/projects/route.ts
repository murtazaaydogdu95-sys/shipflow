import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations/project";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: { _count: { select: { stories: true, sprints: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = createProjectSchema.parse(body);

  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") + "-" + nanoid(6);

  const defaultLabels = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "database", color: "#8b5cf6" },
    { name: "API", color: "#f59e0b" },
    { name: "UI", color: "#ec4899" },
    { name: "auth", color: "#ef4444" },
    { name: "bug", color: "#dc2626" },
    { name: "feature", color: "#2563eb" },
    { name: "chore", color: "#737373" },
  ];

  const project = await prisma.project.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      techStack: data.techStack,
      apiKey: nanoid(32),
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
      labels: {
        create: defaultLabels,
      },
    },
  });

  return NextResponse.json(project);
}
