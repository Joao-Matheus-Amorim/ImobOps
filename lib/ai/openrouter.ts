import type { ChatMessage, ChatResponse, ToolCall, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";
import { zodToJsonSchema } from "./schema";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

// Free, tool-capable models to fall back to when the primary one is rate-limited
// (429). Tried in order; the configured model is always tried first.
// Updated 2026-06 — sourced from openrouter.ai/api/v1/models filtered by
// prompt=0, completion=0, supported_parameters includes "tools".
const FREE_FALLBACKS = [
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-20b:free",
  "poolside/laguna-m.1:free",
  "poolside/laguna-xs.2:free",
  "cohere/north-mini-code:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
];

interface OpenRouterToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export class OpenRouterAdapter implements LlmAdapter {
  readonly name = "openrouter";

  constructor(
    private readonly apiKey = process.env.OPENROUTER_API_KEY ?? "",
    private readonly model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
    private readonly httpReferer = process.env.OPENROUTER_HTTP_REFERER ?? "",
    private readonly appTitle = process.env.OPENROUTER_APP_TITLE ?? "",
  ) {}

  private buildBody(model: string, messages: ChatMessage[], tools: ToolDefinition[]) {
    return {
      model,
      messages: messages.map((message) => {
        // Assistant turns that called tools must carry tool_calls; tool results
        // must carry tool_call_id — required by the function-calling protocol so
        // the agent loop can feed read results back to the model.
        if (message.role === "assistant" && message.toolCalls?.length) {
          return {
            role: "assistant",
            content: message.content || null,
            tool_calls: message.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: JSON.stringify(tc.params ?? {}) },
            })),
          };
        }
        if (message.role === "tool") {
          return {
            role: "tool",
            content: message.content,
            tool_call_id: message.toolCallId,
          };
        }
        return { role: message.role, content: message.content };
      }),
      tools: tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.schema),
        },
      })),
    };
  }

  // Models to try, in order: the configured one first, then the free fallbacks
  // (deduped). On a 429 (rate limit), move to the next; other errors throw.
  private modelChain(): string[] {
    return [...new Set([this.model, ...FREE_FALLBACKS])];
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY nao configurada.");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
    if (this.httpReferer) headers["HTTP-Referer"] = this.httpReferer;
    if (this.appTitle) headers["X-OpenRouter-Title"] = this.appTitle;

    const chain = this.modelChain();
    let lastError = "";
    for (const model of chain) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(this.buildBody(model, messages, tools)),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices: { message: { content: string | null; tool_calls?: OpenRouterToolCall[] } }[];
        };
        const message = data.choices[0]?.message;
        const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
          params: safeParse(toolCall.function.arguments),
        }));
        return { content: message?.content ?? "", toolCalls };
      }
      lastError = `OpenRouter ${res.status}: ${await res.text()}`;
      // Only fall through to the next model on rate limit; surface other errors.
      if (res.status !== 429) throw new Error(lastError);
    }
    throw new Error(lastError || "OpenRouter 429: rate limited em todos os modelos.");
  }

  async *chatStream(messages: ChatMessage[], tools: ToolDefinition[]) {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY nao configurada.");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
    if (this.httpReferer) headers["HTTP-Referer"] = this.httpReferer;
    if (this.appTitle) headers["X-OpenRouter-Title"] = this.appTitle;

    const chain = this.modelChain();
    let lastError = "";
    for (const model of chain) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...this.buildBody(model, messages, tools), stream: true }),
      });
      if (res.ok) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";
        const toolCallAcc: Map<number, { id: string; name: string; args: string }> = new Map();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const payload = trimmed.slice(6);
              if (payload === "[DONE]") {
                const toolCalls: ToolCall[] = [...toolCallAcc.values()]
                  .filter((tc) => tc.name)
                  .map((tc) => ({ id: tc.id, name: tc.name, params: safeParse(tc.args) }));
                yield { delta: "", done: true, response: { content: accumulatedContent, toolCalls } };
                return;
              }
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  accumulatedContent += delta.content;
                  yield { delta: delta.content, done: false };
                }
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const existing = toolCallAcc.get(tc.index) ?? { id: "", name: "", args: "" };
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.name = tc.function.name;
                    if (tc.function?.arguments) existing.args += tc.function.arguments;
                    toolCallAcc.set(tc.index, existing);
                  }
                }
              } catch {
                // skip malformed JSON chunks
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        const toolCalls: ToolCall[] = [...toolCallAcc.values()]
          .filter((tc) => tc.name)
          .map((tc) => ({ id: tc.id, name: tc.name, params: safeParse(tc.args) }));
        yield { delta: "", done: true, response: { content: accumulatedContent, toolCalls } };
        return;
      }
      lastError = `OpenRouter ${res.status}: ${await res.text()}`;
      if (res.status !== 429) throw new Error(lastError);
    }
    throw new Error(lastError || "OpenRouter 429: rate limited em todos os modelos.");
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

