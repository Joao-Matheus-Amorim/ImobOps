// OpenAI adapter via the Chat Completions API. Uses fetch (no SDK dependency).
import type { ChatMessage, ChatResponse, ToolCall, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";
import { zodToJsonSchema } from "./schema";

const API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

interface OpenAiToolCall {
  id: string;
  function: { name: string; arguments: string };
}

export class OpenAiAdapter implements LlmAdapter {
  readonly name = "openai";

  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY ?? "",
    private readonly model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
  ) {}

  private buildBody(messages: ChatMessage[], tools: ToolDefinition[]) {
    return {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: zodToJsonSchema(t.schema),
        },
      })),
    };
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada.");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.buildBody(messages, tools)),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string | null; tool_calls?: OpenAiToolCall[] } }[];
    };
    const msg = data.choices[0]?.message;
    const toolCalls: ToolCall[] = (msg?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      params: safeParse(tc.function.arguments),
    }));
    return { content: msg?.content ?? "", toolCalls };
  }

  async *chatStream(messages: ChatMessage[], tools: ToolDefinition[]) {
    const res = await this.chat(messages, tools);
    yield { delta: res.content, done: false };
    yield { delta: "", done: true, response: res };
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
