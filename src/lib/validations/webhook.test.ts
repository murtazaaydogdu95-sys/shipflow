import { describe, it, expect } from "vitest";
import { isPublicUrl, createWebhookSchema } from "./webhook";

describe("webhook validations", () => {
  describe("isPublicUrl — SSRF protection", () => {
    describe("blocks private/internal URLs", () => {
      it("blocks localhost", () => {
        expect(isPublicUrl("http://localhost/webhook")).toBe(false);
        expect(isPublicUrl("https://localhost:8080/hook")).toBe(false);
      });

      it("blocks 127.0.0.1", () => {
        expect(isPublicUrl("http://127.0.0.1/webhook")).toBe(false);
      });

      it("blocks ::1 (IPv6 loopback)", () => {
        expect(isPublicUrl("http://[::1]/webhook")).toBe(false);
        expect(isPublicUrl("http://::1/webhook")).toBe(false);
      });

      it("blocks 10.x.x.x (private class A)", () => {
        expect(isPublicUrl("http://10.0.0.1/webhook")).toBe(false);
        expect(isPublicUrl("http://10.255.255.255/webhook")).toBe(false);
      });

      it("blocks 172.16-31.x.x (private class B)", () => {
        expect(isPublicUrl("http://172.16.0.1/webhook")).toBe(false);
        expect(isPublicUrl("http://172.31.255.255/webhook")).toBe(false);
      });

      it("allows 172.15.x.x and 172.32.x.x (outside private range)", () => {
        expect(isPublicUrl("http://172.15.0.1/webhook")).toBe(true);
        expect(isPublicUrl("http://172.32.0.1/webhook")).toBe(true);
      });

      it("blocks 192.168.x.x (private class C)", () => {
        expect(isPublicUrl("http://192.168.0.1/webhook")).toBe(false);
        expect(isPublicUrl("http://192.168.1.100/webhook")).toBe(false);
      });

      it("blocks 169.254.x.x (link-local / AWS metadata)", () => {
        expect(isPublicUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
        expect(isPublicUrl("http://169.254.0.1/webhook")).toBe(false);
      });

      it("blocks 0.0.0.0", () => {
        expect(isPublicUrl("http://0.0.0.0/webhook")).toBe(false);
      });

      it("blocks metadata.google.internal", () => {
        expect(isPublicUrl("http://metadata.google.internal/computeMetadata")).toBe(false);
      });

      it("blocks metadata.google", () => {
        expect(isPublicUrl("http://metadata.google/computeMetadata")).toBe(false);
      });

      it("blocks raw IPv6 addresses", () => {
        expect(isPublicUrl("http://[::1]:8080/webhook")).toBe(false);
        expect(isPublicUrl("http://[fe80::1]/webhook")).toBe(false);
      });

      it("blocks non-HTTP schemes", () => {
        expect(isPublicUrl("ftp://example.com/file")).toBe(false);
        expect(isPublicUrl("file:///etc/passwd")).toBe(false);
      });

      it("returns false for invalid URL", () => {
        expect(isPublicUrl("not-a-url")).toBe(false);
        expect(isPublicUrl("")).toBe(false);
      });
    });

    describe("allows public URLs", () => {
      it("allows standard HTTPS URLs", () => {
        expect(isPublicUrl("https://example.com/webhook")).toBe(true);
        expect(isPublicUrl("https://hooks.slack.com/services/xxx")).toBe(true);
      });

      it("allows standard HTTP URLs", () => {
        expect(isPublicUrl("http://example.com/webhook")).toBe(true);
      });

      it("allows public IPs", () => {
        expect(isPublicUrl("http://8.8.8.8/webhook")).toBe(true);
        expect(isPublicUrl("https://1.1.1.1/webhook")).toBe(true);
      });
    });
  });

  describe("createWebhookSchema", () => {
    it("accepts valid webhook", () => {
      const result = createWebhookSchema.safeParse({
        url: "https://example.com/webhook",
        events: ["story.created"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects private URL", () => {
      const result = createWebhookSchema.safeParse({
        url: "http://localhost/webhook",
        events: ["story.created"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL", () => {
      const result = createWebhookSchema.safeParse({
        url: "not-a-url",
        events: ["story.created"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty events array", () => {
      const result = createWebhookSchema.safeParse({
        url: "https://example.com/webhook",
        events: [],
      });
      expect(result.success).toBe(false);
    });

    it("defaults active to true", () => {
      const result = createWebhookSchema.safeParse({
        url: "https://example.com/webhook",
        events: ["story.moved"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(true);
      }
    });

    it("accepts explicit active=false", () => {
      const result = createWebhookSchema.safeParse({
        url: "https://example.com/webhook",
        events: ["story.moved"],
        active: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(false);
      }
    });
  });
});
