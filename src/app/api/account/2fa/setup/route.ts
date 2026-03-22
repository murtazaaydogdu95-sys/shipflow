import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: "Codepylot",
    label: session.user.email || session.user.name || "User",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  // Store secret temporarily (not enabled until verified)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret.base32 },
  });

  const uri = totp.toString();
  const qrCode = await QRCode.toDataURL(uri);

  return NextResponse.json({
    secret: secret.base32,
    qrCode,
    uri,
  });
}
