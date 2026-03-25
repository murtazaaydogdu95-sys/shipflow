import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { savedFilterSchema } from "@/lib/validations/saved-filter";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";

const MAX_SAVED_FILTERS = 10;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  try {
    const filters = await prisma.savedFilter.findMany({
      where: { projectId, userId: access.userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(filters);
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();
  if (access.type !== "session") {
    return NextResponse.json({ error: "Session auth required" }, { status: 403 });
  }

  const parsed = await parseJsonBody(req, 4096);
  if (!parsed.ok) return parsed.response;

  try {
    const data = savedFilterSchema.parse(parsed.data);

    // Enforce max saved filters per user per project
    const count = await prisma.savedFilter.count({
      where: { projectId, userId: access.userId },
    });
    if (count >= MAX_SAVED_FILTERS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SAVED_FILTERS} saved filters per project` },
        { status: 400 }
      );
    }

    // If this filter is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.savedFilter.updateMany({
        where: { projectId, userId: access.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const filter = await prisma.savedFilter.create({
      data: {
        name: data.name,
        filters: data.filters,
        isDefault: data.isDefault ?? false,
        projectId,
        userId: access.userId,
      },
    });

    return NextResponse.json(filter);
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
