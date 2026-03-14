import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { updateRecurringStorySchema } from "@/lib/validations/recurring";
import { parseJsonBody } from "@/lib/api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; recurringId: string }> }
) {
  const { projectId, recurringId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const data = updateRecurringStorySchema.parse(parsed.data);

  const recurring = await prisma.recurringStory.update({
    where: { id: recurringId, projectId },
    data,
  });

  return NextResponse.json(recurring);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; recurringId: string }> }
) {
  const { projectId, recurringId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  await prisma.recurringStory.delete({
    where: { id: recurringId, projectId },
  });

  return NextResponse.json({ success: true });
}
