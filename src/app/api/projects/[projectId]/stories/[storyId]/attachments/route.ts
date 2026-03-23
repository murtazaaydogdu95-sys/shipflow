import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  // Images (SVG excluded — can contain embedded scripts enabling stored XSS)
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  // Documents
  "application/pdf",
  "text/plain", "text/csv", "text/markdown",
  // Office
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Archives
  "application/zip", "application/gzip",
  // Code/data (text/html and text/javascript excluded — can enable stored XSS)
  "application/json", "text/css",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
  ".pdf", ".txt", ".csv", ".md",
  ".doc", ".docx", ".xls", ".xlsx",
  ".zip", ".gz",
  ".json", ".css", ".ts", ".tsx", ".jsx",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  // Verify story belongs to this project
  const storyCheck = await prisma.story.findFirst({ where: { id: storyId, projectId }, select: { id: true } });
  if (!storyCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await prisma.attachment.findMany({
    where: { storyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; storyId: string }> }
) {
  const { projectId, storyId } = await params;
  const access = await requireProjectAccess(req, projectId);
  if (!access) return unauthorizedResponse();

  const story = await prisma.story.findFirst({ where: { id: storyId, projectId } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Validate file type
  const ext = (path.extname(file.name) || "").toLowerCase();
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `File type not allowed: ${ext} (${mimeType})` },
      { status: 400 }
    );
  }

  const safeName = `${randomBytes(16).toString("hex")}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, safeName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.name,
      url: `/uploads/${safeName}`,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      storyId,
    },
  });

  return NextResponse.json(attachment);
}
