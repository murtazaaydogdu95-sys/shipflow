import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string; path?: string[] }> }
) {
  const { storyId, path } = await params;

  const story = await prisma.story.findUnique({
    where: { shortId: storyId },
    select: { previewPort: true },
  });

  if (!story?.previewPort) {
    return NextResponse.json(
      { error: "Preview not available" },
      { status: 404 }
    );
  }

  const targetPath = path ? `/${path.join("/")}` : "/";
  const url = new URL(targetPath, `http://localhost:${story.previewPort}`);
  url.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  headers.set("host", `localhost:${story.previewPort}`);
  // Remove next.js specific headers that shouldn't be forwarded
  headers.delete("x-forwarded-host");

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = req.body;
      // @ts-expect-error duplex is required for streaming request bodies
      fetchOptions.duplex = "half";
    }

    const response = await fetch(url.toString(), fetchOptions);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Preview server is not responding" },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
