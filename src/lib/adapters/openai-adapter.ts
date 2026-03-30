import type { AgentAdapter, AdapterInvokeParams, AdapterResult } from "./types";
import { safeDecrypt } from "@/lib/encryption";

interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIAdapter implements AgentAdapter {
  type = "openai";

  async invoke(params: AdapterInvokeParams): Promise<AdapterResult> {
    const config = (params.agent.adapterConfig as OpenAIConfig) || {};
    const encryptedKey = config.apiKey;
    const apiKey = safeDecrypt(encryptedKey);
    if (!apiKey) {
      return { success: false, error: "OpenAI API key not configured", exitCode: 1 };
    }

    const model = config.model || "gpt-4o";
    const baseUrl = config.baseUrl || "https://api.openai.com/v1";

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: params.prompt }],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(300_000), // 5 minute timeout
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `OpenAI API error: ${response.status} ${errorText.slice(0, 200)}`,
          exitCode: 1,
        };
      }

      const data = await response.json();
      return {
        success: true,
        exitCode: 0,
        output: data.choices?.[0]?.message?.content || "",
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      };
    } catch (err) {
      return {
        success: false,
        error: `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
      };
    }
  }
}
