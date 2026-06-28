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
    const convo = messages.filter((m) => m.role !== "system").map((m) => {
      // Tool results → user + tool_result content block
      if (m.role === "tool") {
        return {
          role: "user" as const,
          content: [{ type: "tool_result" as const, tool_use_id: m.toolCallId!, content: m.content }],
        };
      }
      // Assistant turns with tool calls → content blocks with tool_use
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant",
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              type: "tool_use" as const,
              id: tc.id,
              name: tc.name,
              input: tc.params ?? {},
            })),
          ],
        };
      }
      // Plain user / assistant messages
      return { role: m.role, content: m.content };
    });
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
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");
    const body = this.buildBody(messages, tools);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedContent = "";
    let eventType = "";
    let currentToolId = "";
    let currentToolName = "";
    let currentToolInput = "";
    const toolCalls: ToolCall[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event: ")) {
            eventType = trimmed.slice(7);
            continue;
          }
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          let parsed: Record<string, unknown>;
          try { parsed = JSON.parse(payload); } catch { continue; }

          if (eventType === "content_block_start") {
            const block = parsed.content_block as Record<string, unknown> | undefined;
            if (block?.type === "tool_use") {
              currentToolId = (block.id as string) ?? "";
              currentToolName = (block.name as string) ?? "";
              currentToolInput = "";
            }
          } else if (eventType === "content_block_delta") {
            const delta = parsed.delta as Record<string, unknown> | undefined;
            if (delta?.type === "text_delta") {
              const text = (delta.text as string) ?? "";
              accumulatedContent += text;
              yield { delta: text, done: false };
            } else if (delta?.type === "input_json_delta") {
              currentToolInput += (delta.partial_json as string) ?? "";
            }
          } else if (eventType === "content_block_stop") {
            if (currentToolName) {
              toolCalls.push({ id: currentToolId, name: currentToolName, params: safeParse2(currentToolInput) });
              currentToolName = "";
              currentToolInput = "";
              currentToolId = "";
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    yield { delta: "", done: true, response: { content: accumulatedContent, toolCalls } };
  }
}

function safeParse2(json: string): Record<string, unknown> {
  try { return JSON.parse(json) as Record<string, unknown>; } catch { return {}; }
}
