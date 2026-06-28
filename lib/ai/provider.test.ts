import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("getLlmAdapter", () => {
  it("retorna MockLlmAdapter quando AI_PROVIDER nao definido", async () => {
    vi.stubEnv("AI_PROVIDER", "");
    const { getLlmAdapter } = await import("./provider");
    const adapter = getLlmAdapter();
    expect(adapter.name).toBe("mock");
  });

  it("retorna MockLlmAdapter quando AI_PROVIDER e desconhecido", async () => {
    vi.stubEnv("AI_PROVIDER", "unknown");
    const { getLlmAdapter } = await import("./provider");
    const adapter = getLlmAdapter();
    expect(adapter.name).toBe("mock");
  });

  it("retorna OpenRouterAdapter quando AI_PROVIDER=openrouter", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    const { getLlmAdapter } = await import("./provider");
    const adapter = getLlmAdapter();
    expect(adapter.name).toBe("openrouter");
  });

  it("retorna OpenAiAdapter quando AI_PROVIDER=openai", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    const { getLlmAdapter } = await import("./provider");
    const adapter = getLlmAdapter();
    expect(adapter.name).toBe("openai");
  });

  it("retorna AnthropicAdapter quando AI_PROVIDER=anthropic", async () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    const { getLlmAdapter } = await import("./provider");
    const adapter = getLlmAdapter();
    expect(adapter.name).toBe("anthropic");
  });
});
