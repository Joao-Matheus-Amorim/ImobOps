import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — factories inline (sem referencias a vars externas = sem hoisting)
// ---------------------------------------------------------------------------

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(),
  getPrincipal: vi.fn(),
}));

vi.mock("@/lib/ai/cache", () => ({
  hashRequest: vi.fn(),
  getCachedResponse: vi.fn(),
  setCachedResponse: vi.fn(),
  getCachedToolResult: vi.fn(),
  setCachedToolResult: vi.fn(),
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  waitForCachedResponse: vi.fn(),
}));

vi.mock("@/lib/ai/provider", () => ({
  getLlmAdapter: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------
import { POST } from "./route";
import { getSessionUser, getPrincipal } from "@/lib/session";
import { getLlmAdapter } from "@/lib/ai/provider";
import {
  hashRequest,
  getCachedResponse,
  setCachedResponse,
  getCachedToolResult,
  setCachedToolResult,
  acquireLock,
  releaseLock,
  waitForCachedResponse,
} from "@/lib/ai/cache";
import type { ChatResponse } from "@/lib/types/ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_USER = {
  id: "user-00000001",
  role: "admin" as const,
  tenancyId: "tenancy-00000001",
  displayName: "Admin Test",
  email: "admin@test.com",
  teamMemberIds: [] as string[],
};

const PRINCIPAL = {
  id: "user-00000001",
  role: "admin" as const,
  teamMemberIds: [] as string[],
};

function textResponse(content: string, toolCalls: ChatResponse["toolCalls"] = []): ChatResponse {
  return { content, toolCalls };
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue(SESSION_USER);
    vi.mocked(getPrincipal).mockResolvedValue(PRINCIPAL);
    vi.mocked(hashRequest).mockReturnValue("test-hash");
    vi.mocked(getCachedResponse).mockResolvedValue(null);
    vi.mocked(setCachedResponse).mockResolvedValue(undefined);
    vi.mocked(getCachedToolResult).mockResolvedValue(null);
    vi.mocked(setCachedToolResult).mockResolvedValue(undefined);
    vi.mocked(acquireLock).mockResolvedValue(true);
    vi.mocked(releaseLock).mockResolvedValue(undefined);
    vi.mocked(waitForCachedResponse).mockResolvedValue(null);
    const adapter = { name: "test-adapter", chat: vi.fn(), chatStream: vi.fn() };
    vi.mocked(getLlmAdapter).mockReturnValue(adapter as any);
  });

  it("retorna 401 quando nao autenticado", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    vi.mocked(getPrincipal).mockResolvedValue(null);
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Não autenticado.");
  });

  it("retorna 400 para corpo vazio", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it("retorna 400 para mensagens vazias", async () => {
    const res = await post({ messages: [] });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para role invalida", async () => {
    const res = await post({ messages: [{ role: "admin", content: "x" }] });
    expect(res.status).toBe(400);
  });

  it("retorna resposta textual quando modelo nao chama tools", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockResolvedValue(textResponse("Ola! Como posso ajudar?"));
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string; toolCalls: unknown[]; provider: string };
    expect(body.content).toBe("Ola! Como posso ajudar?");
    expect(body.toolCalls).toEqual([]);
    expect(body.provider).toBe("test-adapter");
  });

  it("executa read tool e retorna texto apos resultado", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat
      .mockResolvedValueOnce(
        textResponse("Vou buscar o cliente.", [
          { id: "call-1", name: "search_clients", params: { query: "Maria" } },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Encontrei a cliente Maria Souza."));

    const res = await post({ messages: [{ role: "user", content: "busca Maria" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string };
    expect(body.content).toBe("Encontrei a cliente Maria Souza.");

    const secondCallArgs = adapter.chat.mock.calls[1][0] as { role: string; content: string }[];
    const toolMessages = secondCallArgs.filter((m: { role: string }) => m.role === "tool");
    expect(toolMessages.length).toBe(1);
    const toolPayload = JSON.parse(toolMessages[0].content);
    expect(Array.isArray(toolPayload)).toBe(true);
  });

  it("executa multiplos read tools em sequencia no loop", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat
      .mockResolvedValueOnce(
        textResponse("Buscando cliente.", [
          { id: "call-1", name: "search_clients", params: { query: "Joao" } },
        ]),
      )
      .mockResolvedValueOnce(
        textResponse("Cliente encontrado, buscando imoveis.", [
          { id: "call-2", name: "search_properties", params: { query: "apto" } },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Aqui estao os resultados."));

    const res = await post({ messages: [{ role: "user", content: "busca Joao e imoveis" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string };
    expect(body.content).toBe("Aqui estao os resultados.");
  });

  it("para o loop quando encontra write tool e a retorna como proposed", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockResolvedValueOnce(
      textResponse("Cliente encontrado, vou criar cobranca.", [
        { id: "call-1", name: "search_clients", params: { query: "Joao" } },
        {
          id: "call-2",
          name: "create_charge",
          params: { clientId: "client-00000002", amount: 500, dueDate: "2026-07-10", method: "boleto" },
        },
      ]),
    );

    const res = await post({ messages: [{ role: "user", content: "cria boleto pro Joao" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      content: string;
      toolCalls: Array<{ name: string; effect: string; requiresConfirmation: boolean }>;
    };
    expect(body.content).toBe("Cliente encontrado, vou criar cobranca.");
    expect(body.toolCalls).toHaveLength(1);
    expect(body.toolCalls[0].name).toBe("create_charge");
    expect(body.toolCalls[0].effect).toBe("write");
    expect(body.toolCalls[0].requiresConfirmation).toBe(true);
    expect(body.toolCalls.some((tc) => tc.name === "search_clients")).toBe(false);
  });

  it("respeita MAX_READ_STEPS = 4 e para o loop", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    for (let i = 0; i < 5; i++) {
      adapter.chat.mockResolvedValueOnce(
        textResponse(`Passo ${i}`, [
          { id: `call-${i}`, name: "search_clients", params: { query: "Maria" } },
        ]),
      );
    }

    const res = await post({ messages: [{ role: "user", content: "busca" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string };
    expect(adapter.chat).toHaveBeenCalledTimes(5);
    expect(body.content).toBe("Passo 4");
  });

  it("retorna 502 quando o modelo lanca erro", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockRejectedValue(new Error("API timeout"));
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(502);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("API timeout");
  });

  it("retorna mensagem amigavel para erro de credito (402)", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockRejectedValue(new Error("402 Payment Required: insufficient credits"));
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    const body = await res.json() as { error: string };
    expect(body.error).toContain("créditos");
  });

  it("retorna mensagem amigavel para rate limit (429)", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockRejectedValue(new Error("429 Too Many Requests: rate limit"));
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    const body = await res.json() as { error: string };
    expect(body.error).toContain("limite de uso atingido");
  });

  it("usa resposta do cache quando disponivel (pula LLM)", async () => {
    vi.mocked(getCachedResponse).mockResolvedValue(textResponse("Resposta do cache"));
    const adapter = vi.mocked(getLlmAdapter)() as any;
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string };
    expect(body.content).toBe("Resposta do cache");
    expect(adapter.chat).not.toHaveBeenCalled();
  });

  it("armazena resposta no cache apos chamar LLM", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockResolvedValue(textResponse("Resposta nova"));
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(200);
    expect(adapter.chat).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setCachedResponse)).toHaveBeenCalledWith(
      "test-hash",
      expect.objectContaining({ content: "Resposta nova" }),
    );
  });

  it("usa dedup lock quando outra requisicao identica esta em andamento", async () => {
    vi.mocked(getCachedResponse).mockResolvedValue(null);
    vi.mocked(acquireLock).mockResolvedValue(false);
    vi.mocked(waitForCachedResponse).mockResolvedValue(textResponse("Resposta da outra requisicao"));
    const adapter = vi.mocked(getLlmAdapter)() as any;
    const res = await post({ messages: [{ role: "user", content: "oi" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { content: string };
    expect(body.content).toBe("Resposta da outra requisicao");
    expect(adapter.chat).not.toHaveBeenCalled();
  });

  it("cacheia resultado de read tool e reusa dentro do mesmo request", async () => {
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat
      .mockResolvedValueOnce(
        textResponse("Buscando.", [
          { id: "call-1", name: "search_clients", params: { query: "Maria" } },
        ]),
      )
      .mockResolvedValueOnce(
        textResponse("De novo.", [
          { id: "call-2", name: "search_clients", params: { query: "Maria" } },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Pronto."));

    let toolResultCached = false;
    vi.mocked(getCachedToolResult).mockImplementation(async () => {
      return toolResultCached ? { id: "cached-client" } : null;
    });
    vi.mocked(setCachedToolResult).mockImplementation(async () => {
      toolResultCached = true;
    });

    const res = await post({ messages: [{ role: "user", content: "busca Maria" }] });
    expect(res.status).toBe(200);
    expect(adapter.chat).toHaveBeenCalledTimes(3);
    expect(vi.mocked(getCachedToolResult)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(setCachedToolResult)).toHaveBeenCalledTimes(1);
  });

  it("retorna tools vazias para usuario nao-admin (tools filter)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ ...SESSION_USER, role: "broker" as const });
    vi.mocked(getPrincipal).mockResolvedValue({ ...PRINCIPAL, role: "broker" as const });
    const adapter = vi.mocked(getLlmAdapter)() as any;
    adapter.chat.mockResolvedValue(
      textResponse("Nao posso fazer isso.", [
        { id: "call-1", name: "search_clients", params: { query: "x" } },
      ]),
    );
    const res = await post({ messages: [{ role: "user", content: "busca" }] });
    expect(res.status).toBe(200);
    const body = await res.json() as { toolCalls: unknown[] };
    expect(body.toolCalls).toEqual([]);
  });
});
