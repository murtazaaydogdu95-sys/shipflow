import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const now = new Date();
  const today = now.getDay(); // 0 = Sunday
  const dayOfMonth = now.getDate();

  const activeRecurring = await prisma.recurringStory.findMany({
    where: { active: true },
  });

  let created = 0;

  for (const recurring of activeRecurring) {
    // Check if due
    let isDue = false;

    if (recurring.frequency === "daily") {
      isDue = !recurring.lastCreatedAt ||
        recurring.lastCreatedAt.toDateString() !== now.toDateString();
    } else if (recurring.frequency === "weekly") {
      const targetDay = recurring.dayOfWeek ?? 1; // Default Monday
      isDue = today === targetDay && (
        !recurring.lastCreatedAt ||
        now.getTime() - recurring.lastCreatedAt.getTime() > 6 * 24 * 60 * 60 * 1000
      );
    } else if (recurring.frequency === "monthly") {
      const targetDay = recurring.dayOfMonth ?? 1;
      isDue = dayOfMonth === targetDay && (
        !recurring.lastCreatedAt ||
        now.getTime() - recurring.lastCreatedAt.getTime() > 25 * 24 * 60 * 60 * 1000
      );
    }

    if (!isDue) continue;

    // Use a serializable transaction to prevent duplicate shortIds
    // when two cron runs overlap
    try {
      await prisma.$transaction(async (tx) => {
        // Use raw SQL MAX for reliable numeric sort (text sort breaks past CP-999)
        const maxResult = await tx.$queryRaw<[{ max_num: number | null }]>`
          SELECT MAX(CAST(SUBSTRING("shortId" FROM 4) AS INTEGER)) as max_num
          FROM "Story"
        `;
        const seq = (maxResult[0]?.max_num ?? 0) + 1;
        const shortId = `CP-${String(seq).padStart(3, "0")}`;

        await tx.story.create({
          data: {
            shortId,
            title: recurring.title,
            description: recurring.description,
            status: "TODO",
            priority: recurring.priority,
            type: recurring.type,
            storyPoints: recurring.storyPoints,
            projectId: recurring.projectId,
          },
        });

        await tx.recurringStory.update({
          where: { id: recurring.id },
          data: { lastCreatedAt: now },
        });
      }, { isolationLevel: "Serializable" });

      created++;
    } catch (err) {
      console.error(`[recurring] Failed to create story for recurring ${recurring.id}:`, err);
    }
  }

  return NextResponse.json({ created, processed: activeRecurring.length });
}
