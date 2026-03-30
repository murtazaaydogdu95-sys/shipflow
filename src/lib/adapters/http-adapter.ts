import { createHmac } from "crypto";
import type { AgentAdapter, AdapterInvokeParams, AdapterResult } from "./types";
import { isPublicUrl } from "@/lib/validations/webhook";
import { safeDecrypt } from "@/lib/encryption";

interface HttpConfig {
  url?: string;
  secret?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class HttpAdapter implements AgentAdapter {
  type = "http";

  async invoke(params: AdapterInvokeParams): Promise<AdapterResult> {
    const config = (params.agent.adapterConfig as HttpConfig) || {};
    const url = config.url;

    if (!url) {
      return { success: false, error: "HTTP adapter URL not configured", exitCode: 1 };
    }

    // SSRF prevention: validate URL is public at invoke time (DNS rebinding prevention)
    if (!isPublicUrl(url)) {
      return {
        success: false,
        error: "HTTP adapter URL must be a public HTTP(S) endpoint",
        exitCode: 1,
      };
    }

    const timeoutMs = config.timeoutMs || 300_000; // default 5 minutes

    // Build request body
    const body = JSON.stringify({
      prompt: params.prompt,
      agent: { id: params.agent.id, name: params.agent.name },
      story: { id: params.story.id, shortId: params.story.shortId, title: params.story.title },
      project: { id: params.project.id },
    });

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    };

    // HMAC signature if secret is configured
    const encryptedSecret = config.secret;
    const secret = safeDecrypt(encryptedSecret);
    if (secret) {
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      headers["X-CodePylot-Signature"] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          error: `HTTP adapter error: ${response.status} ${errorText.slice(0, 200)}`,
          exitCode: 1,
        };
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: data.success !== false,
        exitCode: data.success !== false ? 0 : 1,
        output: data.output || "",
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        costCents: data.costCents || 0,
        error: data.error,
      };
    } catch (err) {
      return {
        success: false,
        error: `HTTP adapter request failed: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
      };
    }
  }
}
