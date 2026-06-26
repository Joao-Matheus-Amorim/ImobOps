// Mock LLM adapter - used when AI_PROVIDER is unset. Echoes a notice and never
// calls tools, so the assistant UI works without any API key.
import type { ChatMessage, ChatResponse, ToolDefinition } from "@/lib/types/ai";
import type { LlmAdapter } from "./adapter";

const NOTICE =
  "Modo mock - defina AI_PROVIDER (openai|anthropic|openrouter) e a respectiva API key para habilitar respostas reais e tool calling.";

export class MockLlmAdapter implements LlmAdapter {
  readonly name = "mock";

  async chat(messages: ChatMessage[], _tools: ToolDefinition[]): Promise<ChatResponse> {
    const last = [...messages].reverse().find((message) => message.role === "user");
    const echo = last?.content ? ` Voce disse: "${last.content}".` : "";
    return { content: `${NOTICE}${echo}`, toolCalls: [] };
  }

  async *chatStream(messages: ChatMessage[], tools: ToolDefinition[]) {
    const response = await this.chat(messages, tools);
    for (const word of response.content.split(" ")) {
      yield { delta: `${word} `, done: false };
    }
    yield { delta: "", done: true, response };
  }
}
