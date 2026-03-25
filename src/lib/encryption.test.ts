import { describe, it, expect, afterEach } from "vitest";
import { encrypt, decrypt, safeDecrypt } from "./encryption";

describe("encryption", () => {
  describe("encrypt / decrypt round-trip", () => {
    it("round-trips a simple string", () => {
      const plaintext = "hello world";
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("round-trips an empty string", () => {
      const ciphertext = encrypt("");
      expect(decrypt(ciphertext)).toBe("");
    });

    it("round-trips unicode characters", () => {
      const plaintext = "こんにちは 🚀 émojis & ñ";
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("round-trips a long string", () => {
      const plaintext = "a".repeat(10_000);
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });
  });

  describe("random IV", () => {
    it("produces different ciphertext each call", () => {
      const plaintext = "same input";
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      expect(a).not.toBe(b);
      // Both decrypt to the same value
      expect(decrypt(a)).toBe(plaintext);
      expect(decrypt(b)).toBe(plaintext);
    });
  });

  describe("output format", () => {
    it("produces valid base64 output", () => {
      const ciphertext = encrypt("test");
      expect(() => Buffer.from(ciphertext, "base64")).not.toThrow();
      // Re-encoding should match (valid base64 round-trip)
      const buf = Buffer.from(ciphertext, "base64");
      expect(buf.toString("base64")).toBe(ciphertext);
    });
  });

  describe("tampered / truncated ciphertext", () => {
    it("throws on tampered ciphertext", () => {
      const ciphertext = encrypt("secret");
      const buf = Buffer.from(ciphertext, "base64");
      // Flip a byte in the middle
      buf[Math.floor(buf.length / 2)] ^= 0xff;
      const tampered = buf.toString("base64");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws on truncated ciphertext", () => {
      const ciphertext = encrypt("secret");
      const truncated = ciphertext.slice(0, 10);
      expect(() => decrypt(truncated)).toThrow();
    });

    it("throws on empty ciphertext", () => {
      expect(() => decrypt("")).toThrow();
    });

    it("throws on garbage input", () => {
      expect(() => decrypt("not-valid-ciphertext")).toThrow();
    });
  });

  describe("safeDecrypt", () => {
    it("returns null for null input", () => {
      expect(safeDecrypt(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(safeDecrypt(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(safeDecrypt("")).toBeNull();
    });

    it("decrypts valid encrypted string", () => {
      const encrypted = encrypt("my-secret");
      expect(safeDecrypt(encrypted)).toBe("my-secret");
    });

    it("returns null for plaintext values instead of passing them through", () => {
      expect(safeDecrypt("plain-text-value")).toBeNull();
    });

    it("returns null for short non-encrypted strings", () => {
      expect(safeDecrypt("sk-abc123")).toBeNull();
    });

    it("returns null for tampered ciphertext", () => {
      const encrypted = encrypt("my-secret");
      const buf = Buffer.from(encrypted, "base64");
      buf[Math.floor(buf.length / 2)] ^= 0xff;
      expect(safeDecrypt(buf.toString("base64"))).toBeNull();
    });
  });

  describe("missing ENCRYPTION_KEY", () => {
    afterEach(() => {
      // Restore the key
      process.env.ENCRYPTION_KEY = "NjMwF4Pz69wK7jqkvlXK7bDDqrFUU6HQXyjPy5y7Imc=";
    });

    it("throws when ENCRYPTION_KEY is not set", () => {
      const original = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
      process.env.ENCRYPTION_KEY = original;
    });
  });
});
