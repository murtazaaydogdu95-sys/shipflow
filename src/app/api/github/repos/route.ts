import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
    select: { access_token: true },
  });

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "No GitHub account linked. Please sign in with GitHub." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";

  const ghRes = await fetch(
    `https://api.github.com/user/repos?sort=pushed&direction=desc&per_page=30&page=${page}&affiliation=owner,collaborator`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (ghRes.status === 401 || ghRes.status === 403) {
    // Clear the stale token so re-auth creates a fresh one
    await prisma.account.updateMany({
      where: { userId: session.user.id, provider: "github" },
      data: { access_token: null },
    });
    return NextResponse.json(
      { error: "GitHub token expired or missing permissions. Please re-authenticate with GitHub." },
      { status: 403 }
    );
  }

  if (!ghRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repositories from GitHub" },
      { status: 502 }
    );
  }

  const repos = await ghRes.json();

  const mapped = repos.map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    htmlUrl: r.html_url,
    cloneUrl: r.clone_url,
    language: r.language,
    updatedAt: r.updated_at,
    stargazersCount: r.stargazers_count,
  }));

  return NextResponse.json(mapped);
}
