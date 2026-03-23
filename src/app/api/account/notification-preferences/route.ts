import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api-error";

const DEFAULT_PREFS = { email: true, inApp: true, digest: "instant" as const };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  const prefs = user?.notificationPrefs
    ? JSON.parse(user.notificationPrefs)
    : DEFAULT_PREFS;

  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as { email?: boolean; inApp?: boolean; digest?: string };

  const { email, inApp, digest } = body;

  // Validate
  if (typeof email !== "boolean" && email !== undefined)
    return NextResponse.json({ error: "email must be boolean" }, { status: 400 });
  if (typeof inApp !== "boolean" && inApp !== undefined)
    return NextResponse.json({ error: "inApp must be boolean" }, { status: 400 });
  if (digest !== undefined && !["instant", "daily", "off"].includes(digest))
    return NextResponse.json({ error: 'digest must be "instant", "daily", or "off"' }, { status: 400 });

  // Merge with existing prefs
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  const current = user?.notificationPrefs
    ? JSON.parse(user.notificationPrefs)
    : DEFAULT_PREFS;

  const updated = {
    ...current,
    ...(email !== undefined && { email }),
    ...(inApp !== undefined && { inApp }),
    ...(digest !== undefined && { digest }),
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: JSON.stringify(updated) },
  });

  return NextResponse.json(updated);
}
