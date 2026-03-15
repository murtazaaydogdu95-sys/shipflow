import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

interface RewriteOptions {
  provider: string;
  apiKey?: string;
  prompt: string;
  model?: string;
}

/** Extract and parse JSON from LLM text that may contain markdown fences or extra text */
function parseAIJson(text: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  const cleaned = fenceMatch ? fenceMatch[1] : text;

  // Find the first { ... } or [ ... ] block
  const start = cleaned.search(/[{\[]/);
  if (start === -1) throw new Error("No JSON found in AI response");

  const openChar = cleaned[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let end = start;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    else if (cleaned[i] === closeChar) depth--;
    if (depth === 0) { end = i; break; }
  }

  return JSON.parse(cleaned.slice(start, end + 1));
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
    return parseAIJson(text);
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
    return parseAIJson(text);
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
  return parseAIJson(textContent.text);
}
