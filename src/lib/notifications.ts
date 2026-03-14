import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";

interface NotificationPrefs {
  email: boolean;
  inApp: boolean;
  digest: "instant" | "daily" | "off";
}

const DEFAULT_PREFS: NotificationPrefs = { email: true, inApp: true, digest: "instant" };

async function getUserPrefs(userId: string): Promise<NotificationPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });
  if (!user?.notificationPrefs) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(user.notificationPrefs) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function shouldNotifyEmail(userId: string): Promise<boolean> {
  const prefs = await getUserPrefs(userId);
  return prefs.email && prefs.digest !== "off";
}

/**
 * Get (or create) unsubscribe token for a user.
 */
async function getUnsubscribeUrl(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailUnsubscribeToken: true },
  });

  let token = user?.emailUnsubscribeToken;
  if (!token) {
    token = randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: userId },
      data: { emailUnsubscribeToken: token },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/api/account/unsubscribe?token=${token}`;
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string;
}) {
  const prefs = await getUserPrefs(params.userId);

  // Only create in-app notification if the user has in-app notifications enabled
  if (!prefs.inApp) return null;

  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      href: params.href,
    },
  });
}

/**
 * Send a notification email if user has email notifications enabled.
 * Non-blocking: failures are logged but don't propagate.
 */
export async function sendNotificationEmail(params: {
  userId: string;
  email: string;
  subject: string;
  html: string;
}) {
  const shouldEmail = await shouldNotifyEmail(params.userId);
  if (!shouldEmail) return;

  const unsubUrl = await getUnsubscribeUrl(params.userId);
  // Append unsubscribe link to html
  const htmlWithUnsub = params.html.replace(
    "</body>",
    `<div style="text-align:center;margin-top:16px;font-size:12px;color:#9ca3af;"><a href="${unsubUrl}" style="color:#6b7280;">Unsubscribe</a></div></body>`
  );

  sendEmail({
    to: params.email,
    subject: params.subject,
    html: htmlWithUnsub,
  }).catch((err) => console.error("[notifications] email send failed:", err));
}
