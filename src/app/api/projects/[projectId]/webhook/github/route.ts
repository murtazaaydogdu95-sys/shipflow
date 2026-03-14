import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { isValidTransition } from "@/lib/story-state-machine";

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

  // Verify signature (required)
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }
  const hmac = createHmac("sha256", project.webhookSecret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest("hex")}`;
  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

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
          // Only transition if the state machine allows it
          if (!isValidTransition(story.status, "DONE")) {
            console.log(`[github-webhook] Skipping ${shortId}: cannot transition from ${story.status} to DONE`);
            continue;
          }
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
          const targetStatus = payload.action === "closed" && pr.merged ? "DONE" : "REVIEW";
          const statusUpdate = isValidTransition(story.status, targetStatus)
            ? { status: targetStatus }
            : {};
          await prisma.story.update({
            where: { id: story.id },
            data: {
              prUrl: pr.html_url,
              ...statusUpdate,
            },
          });

          // Auto-comment on the PR to link to the ShipFlow story
          if (payload.action === "opened" || payload.action === "synchronize") {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const storyUrl = `${appUrl}/projects/${projectId}?story=${story.id}`;
            const commentBody = `Linked to ShipFlow story [${story.shortId}](${storyUrl}) — ${story.title}`;

            // Get GitHub access token from project owner's account
            const projectMember = await prisma.projectMember.findFirst({
              where: { projectId, role: "OWNER" },
              select: { userId: true },
            });
            if (projectMember) {
              const account = await prisma.account.findFirst({
                where: { userId: projectMember.userId, provider: "github" },
                select: { access_token: true },
              });
              if (account?.access_token && project.githubRepo) {
                // Extract owner/repo from GitHub URL
                const repoMatch = project.githubRepo.match(/github\.com\/([^/]+\/[^/]+)/);
                if (repoMatch) {
                  const repo = repoMatch[1].replace(/\.git$/, "");
                  fetch(`https://api.github.com/repos/${repo}/issues/${pr.number}/comments`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${account.access_token}`,
                      Accept: "application/vnd.github.v3+json",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ body: commentBody }),
                    signal: AbortSignal.timeout(10000),
                  }).catch((err) => {
                    console.error("[github-webhook] Failed to post PR comment:", err.message);
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
