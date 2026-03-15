import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Lightweight in-memory sliding-window rate limiter for Edge middleware.
// Avoids importing @upstash/ratelimit + @upstash/redis which bloat the
// Edge Function beyond Vercel's 1 MB limit.
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

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Rate limit auth API calls (exclude session check — it's a harmless read
  // called by SessionProvider on every page load, tab focus, and navigation)
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

  // If authenticated and 2FA required, enforce 2FA on both pages and API routes
  // Allow: /verify-2fa page, /api/auth/*, /api/account/2fa/* (needed for the 2FA flow itself)
  if (
    req.auth?.user &&
    (req.auth as { token?: { requires2FA?: boolean } }).token?.requires2FA &&
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
  // Skip for: onboarding page, API routes, and dashboard (landing page after completing onboarding)
  if (
    req.auth?.user &&
    !req.auth.user.onboardingCompleted &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/dashboard"
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/invites|api/health|api/cron|api/docs|api/preview|api/billing/webhook|_next/static|_next/image|favicon.ico|login|invite|privacy|terms|forgot-password|reset-password|verify-2fa|roadmap|changelog).+)"],
};
