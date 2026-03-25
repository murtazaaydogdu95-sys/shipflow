import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOTP, Secret } from "otpauth";
import { createHash, timingSafeEqual } from "crypto";
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
    select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true },
  });

  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  // Try TOTP code first
  const totp = new TOTP({
    secret: Secret.fromBase32(user.totpSecret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) {
    return NextResponse.json({ success: true });
  }

  // Try backup code — constant-time comparison to prevent timing attacks
  if (user.totpBackupCodes) {
    const hashedCodes: string[] = JSON.parse(user.totpBackupCodes);
    const hashedInput = createHash("sha256").update(code).digest("hex");
    const inputBuffer = Buffer.from(hashedInput, "utf-8");

    let matchIndex = -1;
    for (let i = 0; i < hashedCodes.length; i++) {
      const codeBuffer = Buffer.from(hashedCodes[i], "utf-8");
      try {
        if (timingSafeEqual(inputBuffer, codeBuffer)) {
          matchIndex = i;
        }
      } catch {
        // timingSafeEqual throws on length mismatch — continue to maintain constant time
      }
      // Continue iterating ALL codes to avoid leaking which index matched
    }

    if (matchIndex !== -1) {
      // Remove used backup code
      hashedCodes.splice(matchIndex, 1);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { totpBackupCodes: JSON.stringify(hashedCodes) },
      });
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Invalid code" }, { status: 400 });
}
