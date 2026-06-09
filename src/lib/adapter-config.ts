import { encrypt, safeDecrypt } from "@/lib/encryption";

/**
 * Per-agent adapter credentials (BYOK — bring your own key).
 *
 * Sensitive fields are stored ENCRYPTED in Agent.adapterConfig and must never be
 * returned to the client. Use:
 *  - `mergeAndEncryptAdapterConfig` when saving (create/update)
 *  - `redactAdapterConfig` before returning an agent in any API response
 *  - `getAdapterCredentials` at execution time to recover the plaintext key
 */

// Fields in adapterConfig that hold secrets and must be encrypted at rest.
const SENSITIVE_FIELDS = ["apiKey", "oauthToken"] as const;

type AdapterConfig = Record<string, unknown> | null | undefined;

/**
 * Merge an incoming adapterConfig over the existing one and encrypt any newly
 * provided secret fields. A missing/empty secret field preserves the existing
 * (already-encrypted) value, so partial updates don't wipe a stored key.
 */
export function mergeAndEncryptAdapterConfig(
  incoming: AdapterConfig,
  existing?: AdapterConfig
): Record<string, unknown> | undefined {
  if (incoming == null && existing == null) return undefined;

  const base: Record<string, unknown> = { ...(existing ?? {}) };
  const next: Record<string, unknown> = { ...base, ...(incoming ?? {}) };

  for (const field of SENSITIVE_FIELDS) {
    const provided = incoming?.[field];
    if (typeof provided === "string" && provided.length > 0) {
      // New plaintext secret provided -> encrypt it.
      next[field] = encrypt(provided);
    } else if (field in (incoming ?? {})) {
      // Explicitly cleared (empty/null) -> drop it; otherwise keep existing.
      delete next[field];
    } else if (typeof base[field] === "string") {
      next[field] = base[field];
    }
  }

  return next;
}

/**
 * Strip secret values before returning a config to the client, replacing each
 * with a boolean `<field>Set` flag so the UI can show "key configured".
 */
export function redactAdapterConfig<T extends AdapterConfig>(config: T): Record<string, unknown> | T {
  if (config == null || typeof config !== "object") return config;
  const out: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  for (const field of SENSITIVE_FIELDS) {
    if (field in out) {
      out[`${field}Set`] = typeof out[field] === "string" && (out[field] as string).length > 0;
      delete out[field];
    }
  }
  return out;
}

/** Redact adapterConfig on an agent-shaped object (returns a shallow copy). */
export function redactAgent<T extends { adapterConfig?: unknown }>(agent: T): T {
  if (!agent || typeof agent !== "object") return agent;
  return { ...agent, adapterConfig: redactAdapterConfig(agent.adapterConfig as AdapterConfig) };
}

/** Decrypt the per-agent credentials for use at execution time. */
export function getAdapterCredentials(config: AdapterConfig): {
  apiKey: string | null;
  oauthToken: string | null;
} {
  const c = (config ?? {}) as Record<string, unknown>;
  return {
    apiKey: safeDecrypt(typeof c.apiKey === "string" ? c.apiKey : null),
    oauthToken: safeDecrypt(typeof c.oauthToken === "string" ? c.oauthToken : null),
  };
}
