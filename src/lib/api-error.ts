/**
 * Error sanitization helpers for API routes.
 * Logs full errors server-side, returns generic messages to clients.
 */

import { NextResponse } from "next/server";

/**
 * Strip secrets (tokens, credentials) from a string to prevent log leakage.
 */
export function stripSecrets(text: string): string {
  return text
    // URL credentials (plain): https://x-access-token:TOKEN@github.com → https://[REDACTED]@github.com
    .replace(/https?:\/\/[^@\s]+@/g, (match) => {
      const proto = match.startsWith("https") ? "https" : "http";
      const afterAt = match.endsWith("@") ? "@" : "";
      return `${proto}://[REDACTED]${afterAt}`;
    })
    // URL credentials (percent-encoded @): https://user:pass%40host → redacted
    .replace(/https?:\/\/[^\s]*%40/gi, (match) => {
      const proto = match.startsWith("https") ? "https" : "http";
      return `${proto}://[REDACTED]@`;
    })
    // Bearer tokens (handles tabs/multiple spaces)
    .replace(/Bearer[\s]+\S+/gi, "Bearer [REDACTED]")
    // GitHub tokens (all known prefixes: ghp_, gho_, ghs_, ghr_, ghu_, github_pat_)
    .replace(/\b(ghp_|gho_|ghs_|ghr_|ghu_|github_pat_)\S+/g, "[REDACTED_GH_TOKEN]");
}

/**
 * Log the full error (with secrets stripped) and return a safe message for the client.
 */
export function sanitizeError(err: unknown, fallback = "Internal server error"): string {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const safeMessage = stripSecrets(rawMessage);
  console.error("[api-error]", safeMessage);
  // Sentry integration (added in Phase 2 — guarded to avoid import errors before install)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    // Send sanitized error to Sentry
    Sentry.captureException(err instanceof Error ? new Error(safeMessage) : safeMessage);
  } catch {
    // Sentry not installed yet — skip
  }
  return fallback;
}

/**
 * Parse JSON request body with size limit enforcement.
 * Reads body as text to enforce size limit even when Content-Length is missing.
 */
export async function parseJsonBody<T = unknown>(
  req: Request,
  maxBytes = 512_000
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  // Fast-reject via Content-Length header when available
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Request body too large. Maximum ${Math.round(maxBytes / 1024)}KB allowed.` },
        { status: 413 }
      ),
    };
  }

  try {
    // Read as text first to enforce size limit even without Content-Length
    const text = await req.text();
    if (text.length > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Request body too large. Maximum ${Math.round(maxBytes / 1024)}KB allowed.` },
          { status: 413 }
        ),
      };
    }
    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: "Failed to read request body" }, { status: 400 }),
    };
  }
}

/**
 * Extract safe validation error details from a Zod error.
 */
export function sanitizeValidationError(err: unknown): string {
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    const messages = issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return `Validation failed: ${messages.join(", ")}`;
  }
  return "Validation failed";
}
