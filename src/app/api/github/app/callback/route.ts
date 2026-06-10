import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, forbiddenResponse } from "@/lib/api-auth";

/**
 * GitHub App post-install callback (configure this as the App's "Setup URL").
 * GET /api/github/app/callback?installation_id=...&state=<projectId>&setup_action=install
 * Stores the installation id on the project after re-verifying access.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const installationId = url.searchParams.get("installation_id");
  const projectId = url.searchParams.get("state");
  const setupAction = url.searchParams.get("setup_action");

  const appBase = process.env.NEXTAUTH_URL || url.origin;

  if (!projectId) {
    return NextResponse.json({ error: "missing state" }, { status: 400 });
  }

  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER", "ADMIN"] });
  if (!access) return forbiddenResponse();

  // setup_action can be "install" / "update". On a real install we get an id.
  if (installationId && setupAction !== "request") {
    await prisma.project.update({
      where: { id: projectId },
      data: { githubInstallationId: installationId },
    });
  }

  return NextResponse.redirect(`${appBase}/projects/${projectId}/settings?github=connected`);
}
