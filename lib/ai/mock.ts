// Mock LLM adapter — used when AI_PROVIDER is unset. Echoes a notice and never
// calls tools, so the assistant UI works without any API key.
import type { ChatMessage, ChatResponse, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";

const NOTICE =
  "Modo mock — defina AI_PROVIDER (openai|anthropic) e a respectiva API key para habilitar respostas reais e tool calling.";

export class MockLlmAdapter implements LlmAdapter {
  readonly name = "mock";

  async chat(messages: ChatMessage[], _tools: ToolDefinition[]): Promise<ChatResponse> {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const echo = last?.content ? ` Você disse: "${last.content}".` : "";
    return { content: `${NOTICE}${echo}`, toolCalls: [] };
  }

  async *chatStream(messages: ChatMessage[], tools: ToolDefinition[]) {
    const res = await this.chat(messages, tools);
    for (const word of res.content.split(" ")) {
      yield { delta: word + " ", done: false };
    }
    yield { delta: "", done: true, response: res };
  }
}
