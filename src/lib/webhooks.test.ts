import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetAllMocks } from "@/test/mocks/prisma";
import { createHmac } from "crypto";

// ── Mocks ────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/validations/webhook", () => ({
  isPublicUrl: vi.fn().mockReturnValue(true),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { attemptDelivery, dispatchWebhook } from "./webhooks";
import { isPublicUrl } from "@/lib/validations/webhook";

// ── Helpers ──────────────────────────────────────────────────
function makeWebhook(overrides: Record<string, unknown> = {}) {
  return {
    id: "webhook-1",
    projectId: "project-1",
    url: "https://example.com/webhook",
    secret: "test-secret-key",
    events: JSON.stringify(["story.moved", "story.created"]),
    active: true,
    ...overrides,
  };
}

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    webhookId: "webhook-1",
    event: "story.moved",
    payload: JSON.stringify({ event: "story.moved", data: { storyId: "s1" } }),
    status: "PENDING",
    attempts: 0,
    maxAttempts: 5,
    lastAttemptAt: null,
    nextRetryAt: new Date(),
    httpStatus: null,
    responseBody: null,
    errorMessage: null,
    ...overrides,
  };
}

describe("webhooks", () => {
  beforeEach(() => {
    resetAllMocks();
    mockFetch.mockReset();
    vi.mocked(isPublicUrl).mockReturnValue(true);
  });

  describe("HMAC-SHA256 signature generation", () => {
    it("generates correct HMAC-SHA256 signature", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      // Verify fetch was called with correct signature header
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      const expectedSig = createHmac("sha256", "test-secret-key")
        .update(delivery.payload)
        .digest("hex");
      expect(headers["X-Codepylot-Signature"]).toBe(`sha256=${expectedSig}`);
    });

    it("sends correct event header", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, event: "story.created" });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-Codepylot-Event"]).toBe("story.created");
    });
  });

  describe("dispatchWebhook", () => {
    it("creates delivery records for matching webhooks", async () => {
      const webhook = makeWebhook();
      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "delivery-new" });

      // Mock attemptDelivery (it's fire-and-forget via catch)
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await dispatchWebhook("project-1", "story.moved", { storyId: "s1" });

      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            webhookId: "webhook-1",
            event: "story.moved",
          }),
        })
      );
    });

    it("skips webhooks not subscribed to the event", async () => {
      const webhook = makeWebhook({ events: JSON.stringify(["story.created"]) });
      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);

      await dispatchWebhook("project-1", "story.moved", { storyId: "s1" });

      expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
    });

    it("dispatches to webhooks with wildcard (*) event subscription", async () => {
      const webhook = makeWebhook({ events: JSON.stringify(["*"]) });
      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "delivery-new" });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      await dispatchWebhook("project-1", "story.moved", { storyId: "s1" });

      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalled();
    });

    it("truncates payload exceeding 64KB", async () => {
      const webhook = makeWebhook({ events: JSON.stringify(["*"]) });
      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      mockPrisma.webhookDelivery.create.mockResolvedValue({ id: "delivery-new" });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);

      // Create a payload larger than 64KB
      const largeData = { storyId: "s1", content: "x".repeat(70_000) };
      await dispatchWebhook("project-1", "story.moved", largeData);

      const createCall = mockPrisma.webhookDelivery.create.mock.calls[0][0];
      const storedPayload = JSON.parse(createCall.data.payload);
      expect(storedPayload.data._truncated).toBe(true);
    });
  });

  describe("attemptDelivery", () => {
    it("marks delivery as SUCCESS on 200 response", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUCCESS",
            httpStatus: 200,
            attempts: 1,
          }),
        })
      );
    });

    it("retries on non-OK response when under max attempts", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, attempts: 1, maxAttempts: 5 });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING", // Not FAILED yet — still has retries
            httpStatus: 500,
            attempts: 2,
            nextRetryAt: expect.any(Date),
          }),
        })
      );
    });

    it("marks as DEAD_LETTER when max attempts reached on HTTP failure", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, attempts: 4, maxAttempts: 5 });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve("Service Unavailable"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "DEAD_LETTER",
            attempts: 5,
            nextRetryAt: null,
          }),
        })
      );
    });

    it("logs activity when delivery enters dead letter queue", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, attempts: 4, maxAttempts: 5 });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve("Service Unavailable"),
      });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "WEBHOOK_DEAD_LETTER",
            projectId: "project-1",
            message: expect.stringContaining("story.moved"),
          }),
        })
      );
    });

    it("marks as DEAD_LETTER when max attempts reached on network error", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, attempts: 4, maxAttempts: 5 });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockRejectedValue(new Error("Connection refused"));
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "DEAD_LETTER",
            attempts: 5,
            errorMessage: "Connection refused",
          }),
        })
      );
    });

    it("skips DEAD_LETTER deliveries", async () => {
      const delivery = makeDelivery({ status: "DEAD_LETTER", webhook: makeWebhook() });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);

      await attemptDelivery("delivery-1");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("handles fetch errors with retry", async () => {
      const webhook = makeWebhook();
      const delivery = makeDelivery({ webhook, attempts: 0, maxAttempts: 5 });

      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockFetch.mockRejectedValue(new Error("Network timeout"));
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            errorMessage: "Network timeout",
            attempts: 1,
          }),
        })
      );
    });

    it("skips already-succeeded deliveries", async () => {
      const delivery = makeDelivery({ status: "SUCCESS", webhook: makeWebhook() });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);

      await attemptDelivery("delivery-1");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("fails delivery when URL is not public (SSRF protection)", async () => {
      vi.mocked(isPublicUrl).mockReturnValue(false);

      const webhook = makeWebhook({ url: "http://127.0.0.1/internal" });
      const delivery = makeDelivery({ webhook });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "FAILED",
            errorMessage: expect.stringContaining("private"),
          }),
        })
      );
    });
  });

  describe("exponential backoff", () => {
    it("increases nextRetryAt with each attempt", async () => {
      const webhook = makeWebhook();

      // First retry (attempt 1)
      const delivery1 = makeDelivery({ webhook, attempts: 0, maxAttempts: 5 });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery1);
      mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("") });
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      const firstRetry = mockPrisma.webhookDelivery.update.mock.calls[0][0].data.nextRetryAt;

      // Second retry (attempt 2)
      mockPrisma.webhookDelivery.update.mockReset();
      const delivery2 = makeDelivery({ webhook, attempts: 1, maxAttempts: 5 });
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(delivery2);
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      await attemptDelivery("delivery-1");

      const secondRetry = mockPrisma.webhookDelivery.update.mock.calls[0][0].data.nextRetryAt;

      // Second retry should be further in the future than first
      expect(secondRetry.getTime()).toBeGreaterThan(firstRetry.getTime());
    });
  });
});
