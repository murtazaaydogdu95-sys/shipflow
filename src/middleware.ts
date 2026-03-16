import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Lightweight in-memory sliding-window rate limiter for Edge middleware.
const hits = new Map<string, number[]>();
function edgeRateLimit(key: string, maxReqs: number, windowMs: number): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxReqs) {
    hits.set(key, timestamps);
    return { allowed: false, resetAt: timestamps[0] + windowMs };
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, resetAt: now + windowMs };
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit auth API calls (exclude session check)
  if (pathname.startsWith("/api/auth") && !pathname.startsWith("/api/auth/session")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const result = edgeRateLimit(`auth:${ip}`, 10, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  // API-wide rate limiting (exclude /api/auth and /api/health)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/health")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const result = edgeRateLimit(`api:${ip}`, 60, 60_000);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } }
      );
    }
  }

  // Decode JWT token (lightweight — no provider imports)
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });

  // If authenticated and 2FA required, enforce 2FA on both pages and API routes
  if (
    token &&
    token.requires2FA &&
    !pathname.startsWith("/verify-2fa") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/account/2fa")
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "2FA verification required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/verify-2fa", req.url));
  }

  // If authenticated and onboarding not completed, redirect to onboarding
  if (
    token &&
    !token.onboardingCompleted &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/dashboard"
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/invites|api/health|api/cron|api/docs|api/preview|api/billing/webhook|_next/static|_next/image|favicon.ico|login|invite|privacy|terms|forgot-password|reset-password|verify-2fa|roadmap|changelog).+)"],
};
