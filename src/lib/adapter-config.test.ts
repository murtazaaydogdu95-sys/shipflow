import { describe, it, expect, beforeAll } from "vitest";
import {
  mergeAndEncryptAdapterConfig,
  redactAdapterConfig,
  getAdapterCredentials,
} from "./adapter-config";

beforeAll(() => {
  // 32-byte base64 key (matches encryption.ts getKey which decodes base64)
  process.env.ENCRYPTION_KEY = "NjMwF4Pz69wK7jqkvlXK7bDDqrFUU6HQXyjPy5y7Imc=";
});

describe("adapter-config BYOK", () => {
  describe("mergeAndEncryptAdapterConfig", () => {
    it("encrypts a newly provided apiKey (not stored in plaintext)", () => {
      const out = mergeAndEncryptAdapterConfig({ apiKey: "sk-ant-secret", model: "x" });
      expect(out?.apiKey).toBeTypeOf("string");
      expect(out?.apiKey).not.toBe("sk-ant-secret");
      expect(out?.model).toBe("x");
      expect(getAdapterCredentials(out).apiKey).toBe("sk-ant-secret");
    });

    it("preserves an existing encrypted key when an update omits it", () => {
      const first = mergeAndEncryptAdapterConfig({ apiKey: "sk-keep" });
      const updated = mergeAndEncryptAdapterConfig({ model: "y" }, first);
      expect(updated?.model).toBe("y");
      expect(getAdapterCredentials(updated).apiKey).toBe("sk-keep");
    });

    it("clears the key when explicitly set to empty string", () => {
      const first = mergeAndEncryptAdapterConfig({ apiKey: "sk-old" });
      const cleared = mergeAndEncryptAdapterConfig({ apiKey: "" }, first);
      expect(cleared?.apiKey).toBeUndefined();
      expect(getAdapterCredentials(cleared).apiKey).toBeNull();
    });

    it("encrypts oauthToken too", () => {
      const out = mergeAndEncryptAdapterConfig({ oauthToken: "oauth-xyz" });
      expect(out?.oauthToken).not.toBe("oauth-xyz");
      expect(getAdapterCredentials(out).oauthToken).toBe("oauth-xyz");
    });
  });

  describe("redactAdapterConfig", () => {
    it("removes secret values and exposes only a *Set flag", () => {
      const stored = mergeAndEncryptAdapterConfig({ apiKey: "sk-secret", model: "z" });
      const redacted = redactAdapterConfig(stored) as Record<string, unknown>;
      expect(redacted.apiKey).toBeUndefined();
      expect(redacted.apiKeySet).toBe(true);
      expect(redacted.model).toBe("z");
    });

    it("handles null/empty config", () => {
      expect(redactAdapterConfig(null)).toBeNull();
      expect(redactAdapterConfig({})).toEqual({});
    });
  });
});
