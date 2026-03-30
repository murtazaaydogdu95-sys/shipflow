import type { AgentAdapter, AdapterInvokeParams, AdapterResult } from "./types";

interface OllamaConfig {
  model?: string;
  baseUrl?: string;
}

export class OllamaAdapter implements AgentAdapter {
  type = "ollama";

  async invoke(params: AdapterInvokeParams): Promise<AdapterResult> {
    const config = (params.agent.adapterConfig as OllamaConfig) || {};
    const model = config.model || "llama3";
    const baseUrl = config.baseUrl || process.env.OLLAMA_URL || "http://localhost:11434";

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: params.prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(600_000), // 10 minute timeout for local models
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `Ollama API error: ${response.status} ${errorText.slice(0, 200)}`,
          exitCode: 1,
        };
      }

      const data = await response.json();
      return {
        success: true,
        exitCode: 0,
        output: data.response || "",
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        costCents: 0, // Local models have no cost
      };
    } catch (err) {
      return {
        success: false,
        error: `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
      };
    }
  }
}
