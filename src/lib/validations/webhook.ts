import { z } from "zod";

/**
 * Reject webhook URLs pointing to private/internal networks to prevent SSRF.
 */
export function isPublicUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);

    // Block non-HTTP(S) schemes
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") {
      return false;
    }

    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      // 10.0.0.0/8
      if (parts[0] === 10) return false;
      // 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      // 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return false;
      // 169.254.0.0/16 (link-local / AWS metadata)
      if (parts[0] === 169 && parts[1] === 254) return false;
      // 0.0.0.0
      if (parts.every((p) => p === 0)) return false;
    }

    // Block IPv6 private ranges (simplified — covers common cases)
    if (hostname.startsWith("[") || hostname.includes(":")) {
      return false; // Block all raw IPv6 addresses in webhook URLs
    }

    // Block common metadata hostnames
    if (hostname === "metadata.google.internal" || hostname === "metadata.google") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const webhookUrlSchema = z
  .string()
  .url()
  .refine(isPublicUrl, { message: "Webhook URL must be a public HTTP(S) endpoint. Private/internal URLs are not allowed." });

export const createWebhookSchema = z.object({
  url: webhookUrlSchema,
  events: z.array(z.string()).min(1),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
});
