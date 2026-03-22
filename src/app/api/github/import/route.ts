import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { z } from "zod";
import { sanitizeError, parseJsonBody } from "@/lib/api-error";

const importSchema = z.object({
  repoFullName: z.string().min(1).regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, "Invalid repository name"),
  cloneUrl: z.string().url(),
  htmlUrl: z.string().url(),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/, "Invalid project name"),
  description: z.string().max(500).optional(),
  language: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = importSchema.parse(parsed.data);

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

  const baseDir =
    process.env.CODEPYLOT_REPOS_DIR || join(homedir(), ".codepylot", "repos");
  mkdirSync(baseDir, { recursive: true });

  const targetDir = join(baseDir, data.name);

  if (existsSync(targetDir)) {
    // Check if a project actually exists in the DB for this directory
    const existingProject = await prisma.project.findFirst({
      where: { agentWorkingDir: targetDir },
      select: { id: true },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "This repository has already been imported as a project." },
        { status: 409 }
      );
    }

    // Orphaned directory — clean it up so we can re-clone
    rmSync(targetDir, { recursive: true, force: true });
  }

  try {
    // Clone using token-authenticated URL (execFileSync prevents shell injection)
    const [owner, repo] = data.repoFullName.split("/");
    const authUrl = `https://x-access-token:${account.access_token}@github.com/${owner}/${repo}.git`;
    execFileSync("git", ["clone", authUrl, targetDir], {
      encoding: "utf-8",
      timeout: 120000,
    });

    // Strip token from remote URL
    execFileSync("git", ["remote", "set-url", "origin", `${data.htmlUrl}.git`], {
      cwd: targetDir,
      encoding: "utf-8",
    });
  } catch (error) {
    // Clean up partial clone
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    sanitizeError(error, "Git clone failed");
    return NextResponse.json({ error: "Failed to clone repository" }, { status: 500 });
  }

  // Create Codepylot project
  const slug =
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    nanoid(6);

  const defaultLabels = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "database", color: "#8b5cf6" },
    { name: "API", color: "#f59e0b" },
    { name: "UI", color: "#ec4899" },
    { name: "auth", color: "#ef4444" },
    { name: "bug", color: "#dc2626" },
    { name: "feature", color: "#2563eb" },
    { name: "chore", color: "#737373" },
  ];

  // Get user's current org
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currentOrgId: true },
  });

  const project = await prisma.project.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      techStack: data.language || undefined,
      githubRepo: data.htmlUrl,
      agentWorkingDir: targetDir,
      apiKey: nanoid(32),
      orgId: user?.currentOrgId || undefined,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
      labels: {
        create: defaultLabels,
      },
    },
  });

  return NextResponse.json(project);
}
