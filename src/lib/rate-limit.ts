/**
 * Rate limiter with Upstash Redis support and in-memory fallback.
 *
 * Uses Upstash when UPSTASH_REDIS_REST_URL is set, otherwise falls back
 * to in-memory sliding window (for local dev / docker compose).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  prefix: string;
}

// ─── In-memory fallback ───────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

function createInMemoryLimiter({ windowMs, maxRequests }: RateLimitConfig) {
  const store = new Map<string, WindowEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, 60_000);

  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

      if (entry.timestamps.length >= maxRequests) {
        const oldest = entry.timestamps[0];
        return { allowed: false, remaining: 0, resetAt: oldest + windowMs };
      }

      entry.timestamps.push(now);
      return {
        allowed: true,
        remaining: maxRequests - entry.timestamps.length,
        resetAt: now + windowMs,
      };
    },
  };
}

// ─── Upstash limiter ──────────────────────────────────────

function createUpstashLimiter({ windowMs, maxRequests, prefix }: RateLimitConfig) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  // Startup health check — verify credentials are valid (non-blocking)
  redis.ping().catch((err) => {
    console.error(
      "[rate-limit] Upstash Redis health check FAILED — rate limiting will fail-open on every request.",
      err instanceof Error ? err.message : err
    );
  });

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
    prefix,
  });

  return {
    async check(key: string): Promise<RateLimitResult> {
      try {
        const result = await rl.limit(key);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetAt: result.reset,
        };
      } catch (err) {
        // Fail-open: if Redis is down, allow the request
        console.warn("[rate-limit] Redis error, failing open:", err instanceof Error ? err.message : err);
        return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs };
      }
    },
  };
}

// ─── Factory ──────────────────────────────────────────────

function rateLimit(config: RateLimitConfig) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return createUpstashLimiter(config);
  }
  return createInMemoryLimiter(config);
}

// Pre-configured rate limiters
export const apiRateLimit = rateLimit({ windowMs: 60_000, maxRequests: 60, prefix: "rl:api" });
export const authRateLimit = rateLimit({ windowMs: 60_000, maxRequests: 10, prefix: "rl:auth" });
export const aiRateLimit = rateLimit({ windowMs: 60_000, maxRequests: 10, prefix: "rl:ai" });
// Abuse guard for multi-tenant agent execution: cap manual agent triggers per
// project (concurrency is separately bounded by the agent-slot/plan limits).
export const agentRunRateLimit = rateLimit({ windowMs: 60_000, maxRequests: 20, prefix: "rl:agent" });
