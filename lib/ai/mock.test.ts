import { describe, it, expect } from "vitest";
import { MockLlmAdapter } from "./mock";
import type { ChatMessage, ToolDefinition } from "@/lib/types/ai";

describe("MockLlmAdapter", () => {
  const adapter = new MockLlmAdapter();
  const tools: ToolDefinition[] = [];

  it("chat retorna notice + echo da ultima mensagem do usuario", async () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "Voce e um assistente." },
      { role: "user", content: "Quero alugar um imovel" },
    ];
    const res = await adapter.chat(messages, tools);
    expect(res.content).toContain("Modo mock");
    expect(res.content).toContain("Quero alugar um imovel");
    expect(res.toolCalls).toEqual([]);
  });

  it("chat retorna notice sem echo quando nao ha mensagem do usuario", async () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "Voce e um assistente." },
    ];
    const res = await adapter.chat(messages, tools);
    expect(res.content).toBe("Modo mock - defina AI_PROVIDER (openai|anthropic|openrouter) e a respectiva API key para habilitar respostas reais e tool calling.");
    expect(res.toolCalls).toEqual([]);
  });

  it("chatStream produz chunks e finaliza com done=true", async () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "teste" },
    ];
    const chunks: string[] = [];
    let finalResponse;
    for await (const chunk of adapter.chatStream(messages, tools)) {
      chunks.push(chunk.delta);
      if (chunk.done) finalResponse = chunk.response;
    }
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1]).toBe("");
    expect(finalResponse).toBeDefined();
    expect(finalResponse!.content).toContain("teste");
  });
});
