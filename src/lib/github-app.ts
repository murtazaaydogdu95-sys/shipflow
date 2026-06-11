import { createSign } from "crypto";

/**
 * GitHub App integration for per-tenant git auth (Phase 2, multi-tenant).
 *
 * Each project stores a `githubInstallationId`. At execution time we mint a
 * short-lived (≈1h) installation access token scoped to that installation's
 * repos, instead of relying on a single platform-wide PAT.
 *
 * Required env:
 *   GITHUB_APP_ID            – numeric app id
 *   GITHUB_APP_PRIVATE_KEY   – PEM private key (\n-escaped is fine)
 *   GITHUB_APP_SLUG          – app slug, for the install URL
 */

const GITHUB_API = "https://api.github.com";

export function isGithubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Sign a short-lived (10 min) RS256 JWT authenticating as the GitHub App. */
function getAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!appId || !privateKey) {
    throw new Error("GitHub App not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })
  );
  const signingInput = `${header}.${payload}`;
  const signature = base64url(
    createSign("RSA-SHA256").update(signingInput).sign(privateKey)
  );
  return `${signingInput}.${signature}`;
}

// Cache installation tokens until ~1 min before expiry.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Mint (or return a cached) installation access token for an installation id. */
export async function getInstallationToken(installationId: string): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;

  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAppJwt()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`installation token failed: ${res.status} ${body.slice(0, 120)}`);
  }
  const data = (await res.json()) as { token: string; expires_at: string };
  tokenCache.set(installationId, {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  });
  return data.token;
}

/** Build the URL that sends a user to install the App on their repo(s). */
export function getInstallUrl(state: string): string {
  const raw = process.env.GITHUB_APP_SLUG;
  if (!raw) throw new Error("GITHUB_APP_SLUG not configured");
  // Tolerate either a bare slug ("codepylot-ai-agent") or the full app URL
  // ("https://github.com/apps/codepylot-ai-agent").
  const slug = raw
    .replace(/^https?:\/\/github\.com\/apps\//i, "")
    .replace(/\/.*$/, "")
    .trim();
  return `https://github.com/apps/${slug}/installations/new?state=${encodeURIComponent(state)}`;
}

/** Parse "owner/repo" from a stored githubRepo (URL or shorthand). */
export function parseOwnerRepo(githubRepo: string | null | undefined): { owner: string; repo: string } | null {
  if (!githubRepo) return null;
  const cleaned = githubRepo
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/g, "");
  const parts = cleaned.split("/");
  if (parts.length < 2) return null;
  return { owner: parts[parts.length - 2], repo: parts[parts.length - 1] };
}

/** Build a token-authenticated clone URL for a repo. */
export function authedCloneUrl(token: string, owner: string, repo: string): string {
  return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
}
