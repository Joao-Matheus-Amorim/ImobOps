import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterAdapter } from "./openrouter";
import type { ChatMessage, ToolDefinition } from "@/lib/types/ai";

const msg: ChatMessage[] = [{ role: "user", content: "teste" }];
const tools: ToolDefinition[] = [];

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

describe("OpenRouterAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test-key");
    vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free");
    globalThis.fetch = vi.fn();
  });

  it("usa o modelo configurado e retorna resposta com toolCalls vazio", async () => {
    globalThis.fetch = mockFetch(200, {
      choices: [{ message: { content: "Resposta OK", tool_calls: undefined } }],
    });
    const adapter = new OpenRouterAdapter();
    const res = await adapter.chat(msg, tools);
    expect(res.content).toBe("Resposta OK");
    expect(res.toolCalls).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("mapeia tool_calls da resposta", async () => {
    globalThis.fetch = mockFetch(200, {
      choices: [{
        message: {
          content: null,
          tool_calls: [
            { id: "call-1", function: { name: "search_clients", arguments: '{"query":"Maria"}' } },
          ],
        },
      }],
    });
    const adapter = new OpenRouterAdapter();
    const res = await adapter.chat(msg, tools);
    expect(res.content).toBe("");
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0].name).toBe("search_clients");
    expect(res.toolCalls[0].params).toEqual({ query: "Maria" });
  });

  it("faz fallback para proximo modelo quando o principal retorna 429", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve("Rate limited") });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("{}"),
        json: () => Promise.resolve({ choices: [{ message: { content: "Fallback OK", tool_calls: undefined } }] }),
      });
    });
    const adapter = new OpenRouterAdapter();
    const res = await adapter.chat(msg, tools);
    expect(res.content).toBe("Fallback OK");
    expect(callCount).toBe(2);
  });

  it("lanca erro imediatamente para status nao-429", async () => {
    globalThis.fetch = mockFetch(401, { error: "Unauthorized" });
    const adapter = new OpenRouterAdapter();
    await expect(adapter.chat(msg, tools)).rejects.toThrow("OpenRouter 401");
  });

  it("lanca erro quando todos os modelos retornam 429", async () => {
    globalThis.fetch = mockFetch(429, { error: "Rate limited" });
    const adapter = new OpenRouterAdapter();
    await expect(adapter.chat(msg, tools)).rejects.toThrow("OpenRouter 429");
  });

  it("lanca erro quando API key nao configurada", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const adapter = new OpenRouterAdapter();
    await expect(adapter.chat(msg, tools)).rejects.toThrow("OPENROUTER_API_KEY nao configurada");
  });

  it("chatStream delega para chat e emite chunks", async () => {
    globalThis.fetch = mockFetch(200, {
      choices: [{ message: { content: "Stream response", tool_calls: undefined } }],
    });
    const adapter = new OpenRouterAdapter();
    const chunks: string[] = [];
    for await (const chunk of adapter.chatStream(msg, tools)) {
      chunks.push(chunk.delta);
      if (chunk.done) break;
    }
    expect(chunks).toContain("Stream response");
  });
});
