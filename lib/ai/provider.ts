// Resolve the active LLM adapter from AI_PROVIDER.
import type { LlmAdapter } from "./adapter";
import { MockLlmAdapter } from "./mock";
import { OpenAiAdapter } from "./openai";
import { AnthropicAdapter } from "./anthropic";
import { OpenRouterAdapter } from "./openrouter";
import { aiProvider } from "@/lib/constants";

export function getLlmAdapter(): LlmAdapter {
  switch (aiProvider()) {
    case "openai":
      return new OpenAiAdapter();
    case "anthropic":
      return new AnthropicAdapter();
    case "openrouter":
      return new OpenRouterAdapter();
    default:
      return new MockLlmAdapter();
  }
}
