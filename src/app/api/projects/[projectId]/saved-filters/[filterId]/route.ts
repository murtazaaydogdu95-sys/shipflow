import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { savedFilterSchema } from "@/lib/validations/saved-filter";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; filterId: string }> }
) {
  const { projectId, filterId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  // Verify the filter belongs to the current user
  const existing = await prisma.savedFilter.findFirst({
    where: { id: filterId, projectId, userId: access.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await parseJsonBody(req, 4096);
  if (!parsed.ok) return parsed.response;

  try {
    const data = savedFilterSchema.partial().parse(parsed.data);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.savedFilter.updateMany({
        where: { projectId, userId: access.userId, isDefault: true, id: { not: filterId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.filters !== undefined && { filters: data.filters }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; filterId: string }> }
) {
  const { projectId, filterId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  // Verify the filter belongs to the current user
  const existing = await prisma.savedFilter.findFirst({
    where: { id: filterId, projectId, userId: access.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.savedFilter.delete({ where: { id: filterId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
