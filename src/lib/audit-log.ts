import { prisma } from "@/lib/prisma";

export async function createAuditLog({
  action,
  details,
  userId,
  orgId,
  req,
}: {
  action: string;
  details?: string;
  userId: string;
  orgId: string;
  req?: Request;
}) {
  const ipAddress = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  return prisma.auditLog.create({
    data: {
      action,
      details,
      userId,
      orgId,
      ipAddress,
    },
  });
}
