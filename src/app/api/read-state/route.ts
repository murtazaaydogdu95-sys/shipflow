import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, sanitizeError } from "@/lib/api-error";
import { z } from "zod";

const markReadSchema = z.object({
  entityType: z.enum(["story", "comment", "approval", "notification"]),
  entityId: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, 1024);
  if (!parsed.ok) return parsed.response;

  const validation = markReadSchema.safeParse(parsed.data);
  if (!validation.success) {
    const messages = validation.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    return NextResponse.json(
      { error: `Validation failed: ${messages.join(", ")}` },
      { status: 400 }
    );
  }

  const { entityType, entityId } = validation.data;

  try {
    await prisma.readState.upsert({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType,
          entityId,
        },
      },
      update: { readAt: new Date() },
      create: {
        userId: session.user.id,
        entityType,
        entityId,
        readAt: new Date(),
      },
    });

    // For notifications, also update the Notification.read flag for backward compat
    if (entityType === "notification") {
      await prisma.notification.updateMany({
        where: { id: entityId, userId: session.user.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = sanitizeError(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
