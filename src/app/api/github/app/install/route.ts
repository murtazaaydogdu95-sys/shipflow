import { NextResponse } from "next/server";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";
import { isGithubAppConfigured, getInstallUrl } from "@/lib/github-app";

/**
 * Start the GitHub App installation flow for a project.
 * GET /api/github/app/install?projectId=...  → redirect to GitHub's install page.
 * The `state` carries the projectId; the callback re-verifies project access,
 * so a tampered state can't bind an installation to a foreign project.
 */
export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER", "ADMIN"] });
  if (!access) return forbiddenResponse();

  if (!isGithubAppConfigured() || !process.env.GITHUB_APP_SLUG) {
    return NextResponse.json(
      { error: "GitHub App is not configured on this server" },
      { status: 503 }
    );
  }

  return NextResponse.redirect(getInstallUrl(projectId));
}
