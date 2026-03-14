import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { createRecurringStorySchema } from "@/lib/validations/recurring";
import { parseJsonBody } from "@/lib/api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const recurring = await prisma.recurringStory.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recurring);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = createRecurringStorySchema.parse(parsed.data);

  const recurring = await prisma.recurringStory.create({
    data: {
      ...data,
      projectId,
    },
  });

  return NextResponse.json(recurring, { status: 201 });
}
