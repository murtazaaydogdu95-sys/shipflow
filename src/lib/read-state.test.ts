import { describe, it, expect, vi, beforeEach } from "vitest";
import { markAsRead } from "./read-state";

describe("markAsRead", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with POST method and correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await markAsRead("story", "story-123");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/read-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "story", entityId: "story-123" }),
    });
  });

  it("passes entityType and entityId in the request body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await markAsRead("comment", "comment-456");

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body).toEqual({ entityType: "comment", entityId: "comment-456" });
  });

  it("returns the fetch response", async () => {
    const mockResponse = { ok: true, status: 200 };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await markAsRead("notification", "notif-789");

    expect(result).toBe(mockResponse);
  });

  it("propagates fetch errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(markAsRead("story", "story-123")).rejects.toThrow("Network error");
  });
});
