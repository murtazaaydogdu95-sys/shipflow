import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Soft-delete the user
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      name: "Deleted User",
      email: null,
      image: null,
    },
  });

  // Remove from all projects
  await prisma.projectMember.deleteMany({
    where: { userId },
  });

  // Anonymize activities
  await prisma.activity.updateMany({
    where: { userId },
    data: { userId: null },
  });

  // Delete sessions to invalidate login
  await prisma.session.deleteMany({
    where: { userId },
  });

  // Delete OAuth accounts
  await prisma.account.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ success: true });
}
