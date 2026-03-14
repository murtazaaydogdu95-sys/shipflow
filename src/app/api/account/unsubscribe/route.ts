import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(htmlPage("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const user = await prisma.user.findUnique({
    where: { emailUnsubscribeToken: token },
    select: { id: true, notificationPrefs: true },
  });

  if (!user) {
    return new NextResponse(htmlPage("Invalid or expired unsubscribe link."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Parse existing prefs and disable email
  const currentPrefs = user.notificationPrefs
    ? JSON.parse(user.notificationPrefs)
    : { email: true, inApp: true, digest: "instant" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      notificationPrefs: JSON.stringify({ ...currentPrefs, email: false }),
    },
  });

  return new NextResponse(
    htmlPage("You have been unsubscribed from email notifications. You can re-enable them in your notification settings."),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function htmlPage(message: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribe - ShipFlow</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:400px;text-align:center;padding:40px 20px;">
    <h1 style="font-size:24px;margin:0 0 16px;">ShipFlow</h1>
    <p style="font-size:16px;color:#374151;">${message}</p>
  </div>
</body>
</html>`;
}
