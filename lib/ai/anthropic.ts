// Anthropic adapter via the Messages API. Uses fetch (no SDK dependency).
// Default model: claude-opus-4-8 (latest Opus). Tool use is mapped to ToolCall.
import type { ChatMessage, ChatResponse, ToolCall, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";
import { zodToJsonSchema } from "./schema";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-8";

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export class AnthropicAdapter implements LlmAdapter {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey = process.env.ANTHROPIC_API_KEY ?? "",
    private readonly model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
  ) {}

  private buildBody(messages: ChatMessage[], tools: ToolDefinition[]) {
    const system = messages.find((m) => m.role === "system")?.content;
    const convo = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));
    return {
      model: this.model,
      max_tokens: 1024,
      system,
      messages: convo,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: zodToJsonSchema(t.schema),
      })),
    };
  }

  async chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(this.buildBody(messages, tools)),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: AnthropicContentBlock[] };

    let content = "";
    const toolCalls: ToolCall[] = [];
    for (const block of data.content) {
      if (block.type === "text" && block.text) content += block.text;
      if (block.type === "tool_use" && block.name) {
        toolCalls.push({ id: block.id ?? block.name, name: block.name, params: block.input ?? {} });
      }
    }
    return { content, toolCalls };
  }

  async *chatStream(messages: ChatMessage[], tools: ToolDefinition[]) {
    // Simplified: delegate to non-streaming and emit once. Real streaming can be
    // added via the SSE endpoint later without changing the interface.
    const res = await this.chat(messages, tools);
    yield { delta: res.content, done: false };
    yield { delta: "", done: true, response: res };
  }
}
