import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { updateWebhookSchema } from "@/lib/validations/webhook";
import { parseJsonBody } from "@/lib/api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const { projectId, webhookId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return unauthorizedResponse();

  const parsed = await parseJsonBody(req, 4_000);
  if (!parsed.ok) return parsed.response;
  const data = updateWebhookSchema.parse(parsed.data);

  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, projectId },
  });
  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...(data.url !== undefined ? { url: data.url } : {}),
      ...(data.events !== undefined ? { events: JSON.stringify(data.events) } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
    select: {
      id: true, url: true, events: true, active: true,
      projectId: true, createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  const { projectId, webhookId } = await params;
  const access = await requireProjectAccess(req, projectId, { roles: ["OWNER"] });
  if (!access) return unauthorizedResponse();

  await prisma.webhook.deleteMany({ where: { id: webhookId, projectId } });
  return NextResponse.json({ success: true });
}
