import { describe, it, expect } from "vitest";
import { stripSecrets, sanitizeError, sanitizeValidationError, parseJsonBody } from "./api-error";

describe("api-error", () => {
  describe("stripSecrets", () => {
    it("redacts ghp_ tokens", () => {
      expect(stripSecrets("token is ghp_abc123xyz")).toBe("token is [REDACTED_GH_TOKEN]");
    });

    it("redacts gho_ tokens", () => {
      expect(stripSecrets("gho_someOAuthToken")).toBe("[REDACTED_GH_TOKEN]");
    });

    it("redacts ghs_ tokens", () => {
      expect(stripSecrets("ghs_serverToken")).toBe("[REDACTED_GH_TOKEN]");
    });

    it("redacts ghr_ tokens", () => {
      expect(stripSecrets("ghr_refreshToken")).toBe("[REDACTED_GH_TOKEN]");
    });

    it("redacts ghu_ tokens", () => {
      expect(stripSecrets("ghu_userToken")).toBe("[REDACTED_GH_TOKEN]");
    });

    it("redacts github_pat_ tokens", () => {
      expect(stripSecrets("github_pat_longTokenString123")).toBe("[REDACTED_GH_TOKEN]");
    });

    it("redacts Bearer tokens", () => {
      expect(stripSecrets("Authorization: Bearer mysecrettoken123")).toBe(
        "Authorization: Bearer [REDACTED]"
      );
    });

    it("redacts Bearer tokens with extra spaces", () => {
      expect(stripSecrets("Bearer   mytoken")).toBe("Bearer [REDACTED]");
    });

    it("redacts URL credentials", () => {
      expect(stripSecrets("https://x-access-token:ghp_abc@github.com/repo")).toContain("[REDACTED]");
    });

    it("redacts URL credentials with user:pass format", () => {
      expect(stripSecrets("https://user:password@example.com")).toContain("[REDACTED]");
    });

    it("leaves clean text unchanged", () => {
      const clean = "No secrets in this message";
      expect(stripSecrets(clean)).toBe(clean);
    });

    it("handles multiple secrets in one string", () => {
      const input = "ghp_token1 and Bearer secret and ghs_token2";
      const result = stripSecrets(input);
      expect(result).not.toContain("ghp_token1");
      expect(result).not.toContain("secret");
      expect(result).not.toContain("ghs_token2");
    });

    it("redacts percent-encoded URL credentials (%40)", () => {
      const input = "https://user:pass%40host.com/path";
      const result = stripSecrets(input);
      expect(result).toContain("[REDACTED]");
      expect(result).not.toContain("user:pass");
    });
  });

  describe("sanitizeError", () => {
    it("returns the fallback message, not the raw error", () => {
      const err = new Error("database connection to postgres://user:pass@host failed");
      const result = sanitizeError(err, "Something went wrong");
      expect(result).toBe("Something went wrong");
    });

    it("uses default fallback when none provided", () => {
      const result = sanitizeError(new Error("oops"));
      expect(result).toBe("Internal server error");
    });

    it("handles non-Error objects", () => {
      const result = sanitizeError("string error", "Fallback");
      expect(result).toBe("Fallback");
    });

    it("handles null/undefined", () => {
      expect(sanitizeError(null)).toBe("Internal server error");
      expect(sanitizeError(undefined)).toBe("Internal server error");
    });

    it("never returns the raw error message to the caller", () => {
      const secret = "ghp_secretToken123";
      const err = new Error(`Failed to push: ${secret}`);
      const result = sanitizeError(err);
      expect(result).not.toContain(secret);
    });
  });

  describe("sanitizeValidationError", () => {
    it("extracts Zod-style issue messages", () => {
      const zodLikeError = {
        issues: [
          { path: ["title"], message: "Required" },
          { path: ["priority"], message: "Invalid enum value" },
        ],
      };
      const result = sanitizeValidationError(zodLikeError);
      expect(result).toBe("Validation failed: title: Required, priority: Invalid enum value");
    });

    it("handles nested paths", () => {
      const zodLikeError = {
        issues: [{ path: ["criteria", 0, "given"], message: "Required" }],
      };
      const result = sanitizeValidationError(zodLikeError);
      expect(result).toContain("criteria.0.given: Required");
    });

    it("returns generic message for non-Zod errors", () => {
      expect(sanitizeValidationError(new Error("random"))).toBe("Validation failed");
    });

    it("returns generic message for null", () => {
      expect(sanitizeValidationError(null)).toBe("Validation failed");
    });
  });

  describe("parseJsonBody", () => {
    it("parses valid JSON body", async () => {
      const body = JSON.stringify({ title: "Hello" });
      const req = new Request("http://localhost/test", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      });

      const result = await parseJsonBody(req);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ title: "Hello" });
      }
    });

    it("rejects body exceeding size limit via Content-Length", async () => {
      const req = new Request("http://localhost/test", {
        method: "POST",
        body: "x",
        headers: { "Content-Length": "999999" },
      });

      const result = await parseJsonBody(req, 1000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(413);
      }
    });

    it("rejects body exceeding size limit via actual content", async () => {
      const largeBody = JSON.stringify({ data: "x".repeat(2000) });
      const req = new Request("http://localhost/test", {
        method: "POST",
        body: largeBody,
      });

      const result = await parseJsonBody(req, 100);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(413);
      }
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/test", {
        method: "POST",
        body: "not json {{{",
        headers: { "Content-Type": "application/json" },
      });

      const result = await parseJsonBody(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
      }
    });

    it("returns 400 when req.text() throws a non-SyntaxError", async () => {
      const req = new Request("http://localhost/test", { method: "POST", body: "x" });
      // Consume the body so .text() throws
      await req.text();

      const result = await parseJsonBody(req);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(400);
        const json = await result.response.json();
        expect(json.error).toBe("Failed to read request body");
      }
    });

    it("uses default maxBytes of 512KB", async () => {
      const body = JSON.stringify({ ok: true });
      const req = new Request("http://localhost/test", {
        method: "POST",
        body,
      });

      const result = await parseJsonBody(req);
      expect(result.ok).toBe(true);
    });
  });
});
