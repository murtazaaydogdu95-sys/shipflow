export interface AdapterInvokeParams {
  prompt: string;
  agent: { id: string; adapterConfig: unknown; name: string };
  story: { id: string; shortId: string; title: string };
  project: { id: string; agentWorkingDir: string; apiKey: string };
  workingDir: string;
  mcpConfigPath: string;
}

export interface AdapterResult {
  success: boolean;
  exitCode?: number;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  error?: string;
  output?: string;
}

export interface AgentAdapter {
  type: string;
  invoke(params: AdapterInvokeParams): Promise<AdapterResult>;
}
