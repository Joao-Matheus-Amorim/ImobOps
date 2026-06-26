import type { ChatMessage, ChatResponse, ToolCall, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";
import { zodToJsonSchema } from "./schema";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

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

  private buildBody(messages: ChatMessage[], tools: ToolDefinition[]) {
    return {
      model: this.model,
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

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY nao configurada.");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`,
    };
    if (this.httpReferer) headers["HTTP-Referer"] = this.httpReferer;
    if (this.appTitle) headers["X-OpenRouter-Title"] = this.appTitle;

    const res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(this.buildBody(messages, tools)),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
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
