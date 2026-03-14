import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { isPublicUrl } from "@/lib/validations/webhook";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findUnique({
    where: { id: storyId, projectId },
    select: { deployStatus: true, deployUrl: true, deployedAt: true },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: story.deployStatus || "idle",
    url: story.deployUrl,
    deployedAt: story.deployedAt,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { deployProvider: true, deployToken: true, deployProjectId: true, githubRepo: true },
  });

  if (!project?.deployProvider) {
    return NextResponse.json({ error: "No deploy provider configured" }, { status: 400 });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId, projectId },
    select: { branchName: true, shortId: true, title: true },
  });

  if (!story?.branchName) {
    return NextResponse.json({ error: "No branch to deploy" }, { status: 400 });
  }

  // Mark as deploying
  await prisma.story.update({
    where: { id: storyId },
    data: { deployStatus: "deploying" },
  });

  try {
    let deployUrl: string | null = null;

    if (project.deployProvider === "vercel" && project.deployToken && project.deployProjectId) {
      // Vercel deployment
      const res = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${project.deployToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: project.deployProjectId,
          project: project.deployProjectId,
          gitSource: {
            type: "github",
            ref: story.branchName,
            repoId: project.githubRepo,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        deployUrl = `https://${data.url}`;
      }
    } else if (project.deployProvider === "railway" && project.deployToken) {
      // Railway GraphQL — use variables to prevent injection
      const res = await fetch("https://backboard.railway.com/graphql/v2", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${project.deployToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation($input: DeploymentTriggerCreateInput!) { deploymentTriggerCreate(input: $input) { id } }`,
          variables: {
            input: {
              branch: story.branchName,
              projectId: project.deployProjectId,
            },
          },
        }),
      });
      if (res.ok) {
        deployUrl = `https://railway.app/project/${encodeURIComponent(project.deployProjectId || "")}`;
      }
    } else if (project.deployProvider === "custom" && project.deployProjectId) {
      // Custom webhook — validate URL to prevent SSRF
      if (!isPublicUrl(project.deployProjectId)) {
        return NextResponse.json({ error: "Deploy webhook URL must be a public address" }, { status: 400 });
      }
      const res = await fetch(project.deployProjectId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          shortId: story.shortId,
          branchName: story.branchName,
          title: story.title,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        deployUrl = data.url || null;
      }
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        deployStatus: deployUrl ? "deployed" : "failed",
        deployUrl,
        deployedAt: deployUrl ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      status: deployUrl ? "deployed" : "failed",
      url: deployUrl,
    });
  } catch (error) {
    console.error("[deploy] deployment failed:", error);
    await prisma.story.update({
      where: { id: storyId },
      data: { deployStatus: "failed" },
    });
    return NextResponse.json({ error: "Deployment failed" }, { status: 500 });
  }
}
