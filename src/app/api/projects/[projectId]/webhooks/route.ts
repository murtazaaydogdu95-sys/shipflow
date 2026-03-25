import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { createWebhookSchema } from "@/lib/validations/webhook";
import { parseJsonBody } from "@/lib/api-error";
import { randomBytes } from "crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const webhooks = await prisma.webhook.findMany({
    where: { projectId },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(webhooks);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 64_000);
  if (!parsed.ok) return parsed.response;
  const data = createWebhookSchema.parse(parsed.data);

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      url: data.url,
      events: JSON.stringify(data.events),
      secret,
      active: data.active,
      projectId,
    },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Return secret only on creation (only time user can see it)
  return NextResponse.json({ ...webhook, secret });
}
