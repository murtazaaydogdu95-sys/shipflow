import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startPreview } from "@/lib/preview-manager";

export const dynamic = "force-dynamic";

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string; path?: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId, path } = await params;

  const story = await prisma.story.findUnique({
    where: { shortId: storyId },
    select: {
      id: true,
      previewPort: true,
      branchName: true,
      projectId: true,
      project: {
        select: { members: { where: { userId: session.user.id }, select: { id: true } } },
      },
    },
  });

  if (!story?.project?.members?.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Auto-start preview if not running but story has agent work (a branch)
  let previewPort = story.previewPort;
  if (!previewPort && story.branchName && story.projectId) {
    try {
      const result = await startPreview(story.id, story.projectId);
      previewPort = result.port;
    } catch {
      return NextResponse.json(
        { error: "Preview server failed to start. Check agent logs for details." },
        { status: 503 }
      );
    }
  }

  if (!previewPort) {
    return NextResponse.json(
      { error: "Preview not available — no agent branch found." },
      { status: 404 }
    );
  }

  const basePath = `/api/preview/${storyId}`;
  const targetPath = path ? `/${path.join("/")}` : "/";
  const url = new URL(targetPath, `http://localhost:${previewPort}`);
  url.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  headers.set("host", `localhost:${previewPort}`);
  // Remove next.js specific headers that shouldn't be forwarded
  headers.delete("x-forwarded-host");
  // Don't request compressed responses — fetch() auto-decompresses but
  // we'd still forward the content-encoding header, causing browsers to
  // try to decompress already-decompressed data ("cannot decode raw data").
  headers.delete("accept-encoding");

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      // Don't follow redirects — we need to rewrite Location headers
      // so the browser stays within the proxy path.
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = req.body;
      // @ts-expect-error duplex is required for streaming request bodies
      fetchOptions.duplex = "half";
    }

    const response = await fetch(url.toString(), fetchOptions);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    // Remove content-encoding since fetch() already decompressed the body
    responseHeaders.delete("content-encoding");

    // Rewrite redirect Location headers to stay within the proxy path.
    // Without this, redirects like /login or /dashboard escape the proxy
    // and navigate to the main app instead of the preview server.
    const location = responseHeaders.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      let rewrittenLocation = location;
      // Absolute path redirect (e.g. /login, /dashboard)
      if (location.startsWith("/")) {
        rewrittenLocation = `${basePath}${location}`;
      }
      // Full URL redirect pointing at the preview server
      else if (location.startsWith(`http://localhost:${previewPort}`)) {
        const redirectPath = new URL(location).pathname + new URL(location).search;
        rewrittenLocation = `${basePath}${redirectPath}`;
      }
      responseHeaders.set("location", rewrittenLocation);
      return new NextResponse(null, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // Rewrite asset URLs in HTML and JS responses so CSS/JS load through
    // the proxy instead of going to the main server (where they'd 404).
    // JS files contain dynamic import paths like "/_next/static/chunks/..."
    // that must also go through the proxy for React hydration to work.
    const contentType = responseHeaders.get("content-type") || "";
    const isRewritable =
      contentType.includes("text/html") ||
      contentType.includes("javascript") ||
      contentType.includes("text/css");

    if (isRewritable) {
      const text = await response.text();
      const rewritten = text
        .replaceAll("/_next/", `${basePath}/_next/`)
        .replaceAll("/__nextjs", `${basePath}/__nextjs`);
      responseHeaders.delete("content-length");
      return new NextResponse(rewritten, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    // Preview server is dead — clear stale state so UI stops showing the link
    await prisma.story.updateMany({
      where: { shortId: storyId, previewPort: { not: null } },
      data: { previewPort: null, previewPid: null },
    });
    return NextResponse.json(
      { error: "Preview server is not responding. It may have stopped — try re-triggering the agent." },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
