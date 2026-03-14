import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

interface RewriteOptions {
  provider: string;
  apiKey?: string;
  prompt: string;
  model?: string;
}

export async function rewriteWithAI({ provider, apiKey, prompt, model }: RewriteOptions): Promise<Record<string, unknown>> {
  if (provider === "ollama") {
    const ollama = new OpenAI({
      baseURL: process.env.OLLAMA_URL || "http://localhost:11434/v1",
      apiKey: "ollama",
    });
    const completion = await ollama.chat.completions.create({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Ollama");
    return JSON.parse(text);
  }

  if (provider === "openai") {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");
    return JSON.parse(text);
  }

  // Default: Anthropic
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: model || "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content[0];
  if (textContent.type !== "text") throw new Error("Unexpected AI response format");
  return JSON.parse(textContent.text);
}
