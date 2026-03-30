import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────

// Mock encryption module before importing adapters
vi.mock("@/lib/encryption", () => ({
  safeDecrypt: vi.fn((val: string | null | undefined) => {
    if (!val) return null;
    // Return the value itself for testing purposes (simulating a decrypted value)
    if (val === "encrypted-key") return "sk-test-key-12345";
    return null;
  }),
}));

// Mock isPublicUrl validation
vi.mock("@/lib/validations/webhook", () => ({
  isPublicUrl: vi.fn((url: string) => {
    // Block private/internal URLs
    if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("192.168.")) {
      return false;
    }
    return true;
  }),
}));

// Mock agent-executor (for ClaudeAdapter)
vi.mock("@/lib/agent-executor", () => ({
  getClaudeBin: vi.fn(() => "/usr/local/bin/claude"),
}));

// Mock child_process and fs (for ClaudeAdapter)
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));
vi.mock("fs", () => ({
  openSync: vi.fn().mockReturnValue(3),
  appendFileSync: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getAdapter, listAdapterTypes } from "./registry";
import { ClaudeAdapter } from "./claude-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { OllamaAdapter } from "./ollama-adapter";
import { HttpAdapter } from "./http-adapter";
import { isPublicUrl } from "@/lib/validations/webhook";

// ── Helpers ──────────────────────────────────────────────────

function makeInvokeParams(overrides: Record<string, unknown> = {}) {
  return {
    prompt: "Test prompt",
    agent: { id: "agent-1", adapterConfig: {}, name: "Test Agent" },
    story: { id: "story-1", shortId: "CP-001", title: "Test Story" },
    project: { id: "project-1", agentWorkingDir: "/tmp", apiKey: "pk-123" },
    workingDir: "/tmp/test",
    mcpConfigPath: "/tmp/mcp.json",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe("Adapter Registry", () => {
  it("returns ClaudeAdapter for type 'claude'", () => {
    const adapter = getAdapter("claude");
    expect(adapter).toBeInstanceOf(ClaudeAdapter);
    expect(adapter.type).toBe("claude");
  });

  it("returns OpenAIAdapter for type 'openai'", () => {
    const adapter = getAdapter("openai");
    expect(adapter).toBeInstanceOf(OpenAIAdapter);
    expect(adapter.type).toBe("openai");
  });

  it("returns OllamaAdapter for type 'ollama'", () => {
    const adapter = getAdapter("ollama");
    expect(adapter).toBeInstanceOf(OllamaAdapter);
    expect(adapter.type).toBe("ollama");
  });

  it("returns HttpAdapter for type 'http'", () => {
    const adapter = getAdapter("http");
    expect(adapter).toBeInstanceOf(HttpAdapter);
    expect(adapter.type).toBe("http");
  });

  it("throws for unknown adapter type", () => {
    expect(() => getAdapter("gemini")).toThrow("Unknown adapter type: gemini");
  });

  it("error message lists available adapter types", () => {
    expect(() => getAdapter("unknown")).toThrow(/Available: claude, openai, ollama, http/);
  });

  it("listAdapterTypes returns all registered types", () => {
    const types = listAdapterTypes();
    expect(types).toEqual(["claude", "openai", "ollama", "http"]);
  });
});

describe("OpenAIAdapter", () => {
  const adapter = new OpenAIAdapter();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns error when API key is not configured", async () => {
    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: null }, name: "OpenAI Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("OpenAI API key not configured");
    expect(result.exitCode).toBe(1);
  });

  it("returns error when API key decryption fails", async () => {
    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: "bad-encrypted" }, name: "OpenAI Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("OpenAI API key not configured");
  });

  it("calls OpenAI API with correct payload when key is valid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello from GPT" } }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: "encrypted-key", model: "gpt-4o" }, name: "OpenAI Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello from GPT");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test-key-12345",
        }),
      })
    );
  });

  it("uses default model gpt-4o when not specified", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 5, completion_tokens: 5 },
      }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: "encrypted-key" }, name: "OpenAI Agent" },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe("gpt-4o");
  });

  it("handles API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: "encrypted-key" }, name: "OpenAI Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("OpenAI API error: 429");
  });

  it("handles fetch error (network failure)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { apiKey: "encrypted-key" }, name: "OpenAI Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("OpenAI request failed: Network timeout");
  });

  it("uses custom baseUrl when configured", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    });

    const params = makeInvokeParams({
      agent: {
        id: "a1",
        adapterConfig: { apiKey: "encrypted-key", baseUrl: "https://custom.openai.com/v1" },
        name: "OpenAI Agent",
      },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom.openai.com/v1/chat/completions",
      expect.anything()
    );
  });
});

describe("OllamaAdapter", () => {
  const adapter = new OllamaAdapter();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("uses default URL http://localhost:11434 when not configured", async () => {
    // Clear OLLAMA_URL env var
    const origEnv = process.env.OLLAMA_URL;
    delete process.env.OLLAMA_URL;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: "Hello from Ollama",
        prompt_eval_count: 5,
        eval_count: 10,
      }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "Ollama Agent" },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/generate",
      expect.anything()
    );

    // Restore
    if (origEnv) process.env.OLLAMA_URL = origEnv;
  });

  it("uses OLLAMA_URL environment variable when set", async () => {
    const origEnv = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = "http://gpu-server:11434";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: "ok",
        prompt_eval_count: 1,
        eval_count: 1,
      }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "Ollama Agent" },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://gpu-server:11434/api/generate",
      expect.anything()
    );

    // Restore
    if (origEnv) {
      process.env.OLLAMA_URL = origEnv;
    } else {
      delete process.env.OLLAMA_URL;
    }
  });

  it("uses config baseUrl over environment variable", async () => {
    const origEnv = process.env.OLLAMA_URL;
    process.env.OLLAMA_URL = "http://env-server:11434";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: "ok",
        prompt_eval_count: 1,
        eval_count: 1,
      }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { baseUrl: "http://config-server:11434" }, name: "Ollama Agent" },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://config-server:11434/api/generate",
      expect.anything()
    );

    if (origEnv) {
      process.env.OLLAMA_URL = origEnv;
    } else {
      delete process.env.OLLAMA_URL;
    }
  });

  it("defaults to llama3 model", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: "ok", prompt_eval_count: 1, eval_count: 1 }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "Ollama Agent" },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("llama3");
  });

  it("reports zero cost for local models", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: "ok", prompt_eval_count: 100, eval_count: 200 }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "Ollama Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(true);
    expect(result.costCents).toBe(0);
  });

  it("handles Ollama API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Model not found",
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "Ollama Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Ollama API error: 500");
  });
});

describe("HttpAdapter", () => {
  const adapter = new HttpAdapter();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(isPublicUrl).mockClear();
  });

  it("returns error when URL is not configured", async () => {
    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: {}, name: "HTTP Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP adapter URL not configured");
  });

  it("validates URL with isPublicUrl (rejects private URLs)", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(false);

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { url: "http://192.168.1.1/agent" }, name: "HTTP Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP adapter URL must be a public HTTP(S) endpoint");
    expect(isPublicUrl).toHaveBeenCalledWith("http://192.168.1.1/agent");
  });

  it("allows public URLs and makes POST request", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, output: "Task done" }),
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { url: "https://api.example.com/agent" }, name: "HTTP Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(true);
    expect(result.output).toBe("Task done");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/agent",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes HMAC signature when secret is configured", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const params = makeInvokeParams({
      agent: {
        id: "a1",
        adapterConfig: { url: "https://api.example.com/agent", secret: "encrypted-key" },
        name: "HTTP Agent",
      },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-CodePylot-Signature"]).toBeDefined();
    expect(headers["X-CodePylot-Signature"]).toMatch(/^sha256=/);
  });

  it("handles fetch network errors", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(true);
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { url: "https://api.example.com/agent" }, name: "HTTP Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP adapter request failed: Connection refused");
  });

  it("handles non-ok HTTP response", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    });

    const params = makeInvokeParams({
      agent: { id: "a1", adapterConfig: { url: "https://api.example.com/agent" }, name: "HTTP Agent" },
    });

    const result = await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP adapter error: 502");
  });

  it("passes custom headers from config", async () => {
    vi.mocked(isPublicUrl).mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const params = makeInvokeParams({
      agent: {
        id: "a1",
        adapterConfig: {
          url: "https://api.example.com/agent",
          headers: { "X-Custom": "value" },
        },
        name: "HTTP Agent",
      },
    });

    await adapter.invoke(params as Parameters<typeof adapter.invoke>[0]);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-Custom"]).toBe("value");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
