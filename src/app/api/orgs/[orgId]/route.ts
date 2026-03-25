import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkOrgPermission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { parseJsonBody } from "@/lib/api-error";
import { sendEmail } from "@/lib/email";
import { launchDateUpdatedEmail } from "@/lib/email-templates";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: { select: { members: true, projects: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...org, role: member.role });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:settings");
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;

  const { name, launchDate } = body;
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
    return NextResponse.json({ error: "Organization name must be at least 2 characters" }, { status: 400 });
  }

  // Validate launchDate format if provided
  let parsedLaunchDate: Date | null | undefined;
  if (launchDate !== undefined) {
    if (launchDate === null) {
      parsedLaunchDate = null;
    } else {
      if (typeof launchDate !== "string") {
        return NextResponse.json({ error: "Launch date must be a valid ISO 8601 date string" }, { status: 400 });
      }
      const d = new Date(launchDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Launch date must be a valid ISO 8601 date string" }, { status: 400 });
      }
      if (d.getTime() < Date.now()) {
        return NextResponse.json({ error: "Launch date must be in the future" }, { status: 400 });
      }
      parsedLaunchDate = d;
    }
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(parsedLaunchDate !== undefined ? { launchDate: parsedLaunchDate } : {}),
    },
  });

  createAuditLog({
    action: "ORG_UPDATED",
    details: `Updated organization: ${org.name}`,
    userId: session.user.id,
    orgId,
    req,
  }).catch(console.error);

  // Send email notification to all org members when launch date is updated
  if (parsedLaunchDate !== undefined && parsedLaunchDate !== null) {
    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { email: true, name: true } } },
    });

    const updaterName = session.user.name || session.user.email || "A team member";
    const formattedDate = parsedLaunchDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    for (const member of members) {
      if (member.user.email) {
        const email = launchDateUpdatedEmail({
          orgName: org.name,
          updaterName,
          launchDate: formattedDate,
        });
        sendEmail({ to: member.user.email, ...email }).catch(console.error);
      }
    }
  }

  return NextResponse.json(org);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await params;

  const role = await checkOrgPermission(session.user.id, orgId, "org:delete");
  if (!role) return NextResponse.json({ error: "Only organization owners can delete organizations" }, { status: 403 });

  // Check if this is the user's only org
  const orgCount = await prisma.orgMember.count({ where: { userId: session.user.id } });
  if (orgCount <= 1) {
    return NextResponse.json({ error: "Cannot delete your only organization" }, { status: 400 });
  }

  // Audit log before deletion
  await createAuditLog({
    action: "ORG_DELETED",
    details: `Deleted organization`,
    userId: session.user.id,
    orgId,
    req,
  }).catch(console.error);

  // Delete the org (cascades to projects, members, etc.)
  await prisma.organization.delete({ where: { id: orgId } });

  // Switch user to another org
  const anotherOrg = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
    select: { orgId: true },
  });
  if (anotherOrg) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { currentOrgId: anotherOrg.orgId },
    });
  }

  return NextResponse.json({ success: true });
}
