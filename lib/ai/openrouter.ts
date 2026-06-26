import type { ChatMessage, ChatResponse, ToolCall, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";
import { zodToJsonSchema } from "./schema";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

// Free, tool-capable models to fall back to when the primary one is rate-limited
// (429). Tried in order; the configured model is always tried first.
const FREE_FALLBACKS = [
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
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
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
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
    const response = await this.chat(messages, tools);
    yield { delta: response.content, done: false };
    yield { delta: "", done: true, response };
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
