// LLM adapter interface. Provider is chosen by AI_PROVIDER env (openai|anthropic),
// falling back to a mock that echoes a notice.
import type { ChatMessage, ChatResponse, ToolDefinition } from "@/lib/types/ai";

export interface LlmAdapter {
  readonly name: string;
  // Non-streaming chat with optional tool definitions.
  chat(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse>;
  // Streaming chat — yields content chunks. Tool calls are emitted at the end.
  chatStream(
    messages: ChatMessage[],
    tools: ToolDefinition[],
  ): AsyncIterable<{ delta: string; done: boolean; response?: ChatResponse }>;
}

// Build a compact JSON tool schema list to pass to providers (name/description).
export function describeTools(tools: ToolDefinition[]): { name: string; description: string }[] {
  return tools.map((t) => ({ name: t.name, description: t.description }));
}
