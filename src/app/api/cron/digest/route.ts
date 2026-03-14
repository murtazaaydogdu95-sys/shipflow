import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { dailyDigestEmail } from "@/lib/email-templates";
import { timingSafeEqual } from "crypto";

export async function POST(req: Request) {
  // Verify: Bearer token OR Vercel cron header (only trust on actual Vercel deployments)
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  const vercelCron = req.headers.get("x-vercel-cron");
  const isVercel = !!process.env.VERCEL;
  if (!(isVercel && vercelCron)) {
    const expected = process.env.CRON_SECRET || "";
    const provided = secret || "";
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (!expected || expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find users with daily digest preference
  const users = await prisma.user.findMany({
    where: {
      notificationPrefs: { contains: '"daily"' },
      deletedAt: null,
    },
    select: { id: true, name: true, email: true },
  });

  let sent = 0;
  for (const user of users) {
    if (!user.email) continue;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        read: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (notifications.length === 0) continue;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { subject, html } = dailyDigestEmail({
      userName: user.name || "there",
      notifications: notifications.map((n) => ({ title: n.title, message: n.message })),
      dashboardUrl: `${appUrl}/dashboard`,
    });

    await sendEmail({ to: user.email, subject, html }).catch(console.error);
    sent++;
  }

  return NextResponse.json({ success: true, sent });
}
