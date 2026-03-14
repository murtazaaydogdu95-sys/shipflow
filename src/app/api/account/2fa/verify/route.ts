import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOTP, Secret } from "otpauth";
import { randomBytes, createHash } from "crypto";
import { parseJsonBody } from "@/lib/api-error";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 1024);
  if (!parsed.ok) return parsed.response;
  const { code } = parsed.data as { code?: string };
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true },
  });

  if (!user?.totpSecret) {
    return NextResponse.json({ error: "2FA setup not initiated" }, { status: 400 });
  }

  const totp = new TOTP({
    secret: Secret.fromBase32(user.totpSecret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Generate 10 backup codes
  const backupCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(4).toString("hex");
    backupCodes.push(code);
    hashedCodes.push(createHash("sha256").update(code).digest("hex"));
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpEnabled: true,
      totpBackupCodes: JSON.stringify(hashedCodes),
    },
  });

  return NextResponse.json({
    success: true,
    backupCodes,
  });
}
