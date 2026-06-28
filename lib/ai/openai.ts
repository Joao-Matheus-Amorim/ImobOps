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
      messages: messages.map((m) => {
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: JSON.stringify(tc.params ?? {}) },
            })),
          };
        }
        if (m.role === "tool") {
          return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
        }
        return { role: m.role, content: m.content };
      }),
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
    if (!this.apiKey) throw new Error("OPENAI_API_KEY não configurada.");
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ ...this.buildBody(messages, tools), stream: true }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);

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
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}
