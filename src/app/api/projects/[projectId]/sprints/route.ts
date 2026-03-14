import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { createSprintSchema } from "@/lib/validations/sprint";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    include: {
      _count: { select: { stories: true } },
      stories: {
        select: { storyPoints: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sprints);
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = createSprintSchema.parse(parsed.data);

  const count = await prisma.sprint.count({ where: { projectId } });
  const sprint = await prisma.sprint.create({
    data: {
      name: data.name || `Sprint ${count + 1}`,
      goal: data.goal,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      projectId,
    },
  });

  return NextResponse.json(sprint);
}
