import type { AgentAdapter } from "./types";
import { ClaudeAdapter } from "./claude-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { OllamaAdapter } from "./ollama-adapter";
import { HttpAdapter } from "./http-adapter";

const adapters: Record<string, AgentAdapter> = {
  claude: new ClaudeAdapter(),
  openai: new OpenAIAdapter(),
  ollama: new OllamaAdapter(),
  http: new HttpAdapter(),
};

export function getAdapter(type: string): AgentAdapter {
  const adapter = adapters[type];
  if (!adapter) {
    throw new Error(`Unknown adapter type: ${type}. Available: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

export function listAdapterTypes(): string[] {
  return Object.keys(adapters);
}
