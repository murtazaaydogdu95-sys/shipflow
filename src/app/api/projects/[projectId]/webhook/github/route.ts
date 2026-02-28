import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await req.text();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project?.webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 404 });
  }

  // Verify signature
  const signature = req.headers.get("x-hub-signature-256");
  if (signature) {
    const hmac = createHmac("sha256", project.webhookSecret);
    hmac.update(body);
    const expected = `sha256=${hmac.digest("hex")}`;
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "push") {
    for (const commit of payload.commits || []) {
      // Match [SF-XXX] pattern in commit messages
      const matches = commit.message.matchAll(/\[SF-(\d+)\]/gi);
      for (const match of matches) {
        const shortId = `SF-${match[1]}`;
        const story = await prisma.story.findFirst({
          where: { projectId, shortId },
        });
        if (story) {
          await prisma.story.update({
            where: { id: story.id },
            data: {
              status: "DONE",
              commitHash: commit.id,
            },
          });
          await prisma.activity.create({
            data: {
              type: "GITHUB_COMMIT",
              message: `Completed via commit: ${commit.message.slice(0, 100)}`,
              metadata: JSON.stringify({
                commitSha: commit.id,
                commitUrl: commit.url,
                author: commit.author?.name,
              }),
              projectId,
              storyId: story.id,
            },
          });
        }
      }
    }
  }

  if (event === "pull_request") {
    const pr = payload.pull_request;
    if (pr) {
      const matches = pr.title.matchAll(/\[SF-(\d+)\]/gi);
      for (const match of matches) {
        const shortId = `SF-${match[1]}`;
        const story = await prisma.story.findFirst({
          where: { projectId, shortId },
        });
        if (story) {
          await prisma.story.update({
            where: { id: story.id },
            data: {
              prUrl: pr.html_url,
              status: payload.action === "closed" && pr.merged ? "DONE" : "REVIEW",
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
