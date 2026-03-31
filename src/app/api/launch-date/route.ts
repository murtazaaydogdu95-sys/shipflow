import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LAUNCH_DATE = "2026-04-01T07:01:00Z";

export async function GET() {
  try {
    // Find the first organization with a configured launch date
    const org = await prisma.organization.findFirst({
      where: { launchDate: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { launchDate: true },
    });

    const launchDate = org?.launchDate?.toISOString() ?? DEFAULT_LAUNCH_DATE;

    return NextResponse.json(
      { launchDate },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve launch date. Please try again later." },
      { status: 500 }
    );
  }
}
