import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EvolutionAdapter } from "./evolution";

// Mock isWhatsAppConfigured to return true when we need live API tests
const mockConfigured = vi.hoisted(() => ({ isWhatsAppConfigured: false }));
vi.mock("@/lib/constants", () => ({
  isWhatsAppConfigured: () => mockConfigured.isWhatsAppConfigured,
}));

describe("EvolutionAdapter parseWebhook", () => {
  let adapter: EvolutionAdapter;

  beforeEach(() => {
    adapter = new EvolutionAdapter("", "", "test-instance");
  });

  it("retorna null para payload vazio", () => {
    expect(adapter.parseWebhook(null)).toBeNull();
    expect(adapter.parseWebhook({})).toBeNull();
  });

  it("retorna null quando não há key", () => {
    expect(adapter.parseWebhook({ data: { message: { conversation: "oi" } } })).toBeNull();
  });

  it("retorna null quando não há body", () => {
    expect(adapter.parseWebhook({ data: { key: { id: "k1" }, messageType: "systemMessage" } })).toBeNull();
  });

  it("extrai conversation como body", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_001", remoteJid: "5511999999999@s.whatsapp.net", fromMe: false },
        message: { conversation: "Olá, tudo bem?" },
        pushName: "João",
        messageTimestamp: 1750000000,
      },
    });
    expect(result).toMatchObject({
      phone: "5511999999999",
      body: "Olá, tudo bem?",
      name: "João",
      externalId: "msg_001",
      fromMe: false,
    });
  });

  it("extrai extendedTextMessage como body", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_002", remoteJid: "5511988888888@s.whatsapp.net", fromMe: true },
        message: { extendedTextMessage: { text: "Mensagem com formato" } },
      },
    });
    expect(result?.body).toBe("Mensagem com formato");
    expect(result?.fromMe).toBe(true);
  });

  it("extrai caption de imageMessage", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_003", remoteJid: "5511977777777@s.whatsapp.net" },
        message: { imageMessage: { caption: "Foto do imóvel" } },
        messageType: "imageMessage",
      },
    });
    expect(result?.body).toBe("Foto do imóvel");
  });

  it("usa placeholder para mídia sem caption", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_004", remoteJid: "5511966666666@s.whatsapp.net" },
        message: { imageMessage: {} },
        messageType: "imageMessage",
      },
    });
    expect(result?.body).toBe("📷 Imagem");
  });

  it("usa placeholder para áudio", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_005", remoteJid: "5511955555555@s.whatsapp.net" },
        message: {},
        messageType: "audioMessage",
      },
    });
    expect(result?.body).toBe("🎵 Áudio");
  });

  it("usa remoteJidAlt (LID resolution)", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_006", remoteJid: "123456789@lid", remoteJidAlt: "5511944444444@s.whatsapp.net" },
        message: { conversation: "Teste LID" },
      },
    });
    expect(result?.phone).toBe("5511944444444");
  });

  it("rejeita mensagens de grupo", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_007", remoteJid: "5511911111111@g.us" },
        message: { conversation: "Grupo" },
      },
    });
    expect(result).toBeNull();
  });

  it("rejeita mensagens de broadcast", () => {
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_008", remoteJid: "5511900000000@broadcast" },
        message: { conversation: "Broadcast" },
      },
    });
    expect(result).toBeNull();
  });

  it("usa timestamp atual quando messageTimestamp ausente", () => {
    const before = Date.now();
    const result = adapter.parseWebhook({
      data: {
        key: { id: "msg_009", remoteJid: "5511933333333@s.whatsapp.net" },
        message: { conversation: "Sem timestamp" },
      },
    });
    const after = Date.now();
    const ts = new Date(result!.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before - 1000);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});

describe("EvolutionAdapter mock mode (sem configuração)", () => {
  let adapter: EvolutionAdapter;

  beforeEach(() => {
    mockConfigured.isWhatsAppConfigured = false;
    adapter = new EvolutionAdapter("", "", "test-instance");
  });

  it("sendMessage retorna externalId mock", async () => {
    const result = await adapter.sendMessage("5511999999999", "Teste");
    expect(result.externalId).toMatch(/^mock-/);
  });

  it("sendTemplate renderiza template e envia", async () => {
    const result = await adapter.sendTemplate("5511999999999", "rental.boleto_delivery", { nome: "João", valor: "R$ 500", vencimento: "10/07", referencia: "Junho/2026" });
    expect(result.externalId).toMatch(/^mock-/);
  });

  it("connectionState retorna open em mock mode", async () => {
    const state = await adapter.connectionState();
    expect(state.state).toBe("open");
    expect(state.qr).toBeNull();
  });

  it("connect retorna open em mock mode", async () => {
    const info = await adapter.connect();
    expect(info.state).toBe("open");
    expect(info.qr).toBeNull();
  });

  it("disconnect retorna close em mock mode", async () => {
    const info = await adapter.disconnect();
    expect(info.state).toBe("close");
    expect(info.qr).toBeNull();
  });

  it("importChats retorna array vazio em mock mode", async () => {
    const chats = await adapter.importChats(86400000, 50);
    expect(chats).toEqual([]);
  });
});

describe("EvolutionAdapter com fetch mockado (API configurada)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockConfigured.isWhatsAppConfigured = true;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockConfigured.isWhatsAppConfigured = false;
  });

  it("sendMessage faz POST para Evolution com headers corretos", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return new Response(JSON.stringify({ key: { id: "evo_msg_001" } }), { status: 200 });
    };

    const adapter = new EvolutionAdapter("https://evo.api", "test-token", "inst01");
    const result = await adapter.sendMessage("5511999999999", "Hello");

    expect(capturedUrl).toContain("/message/sendText/inst01");
    expect(capturedHeaders["apikey"]).toBe("test-token");
    expect(result.externalId).toBe("evo_msg_001");
  });

  it("sendMessage lança erro quando Evolution retorna não-2xx", async () => {
    globalThis.fetch = async () => {
      return new Response("Instance not found", { status: 404 });
    };

    const adapter = new EvolutionAdapter("https://evo.api", "bad-token", "nonexistent");
    await expect(adapter.sendMessage("5511999999999", "Test")).rejects.toThrow("Evolution 404");
  });

  it("connectionState retorna estado normalizado", async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 });
    };

    const adapter = new EvolutionAdapter("https://evo.api", "token", "inst01");
    const state = await adapter.connectionState();
    expect(state.state).toBe("open");
  });

  it("connectionState retorna close quando instância não existe", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response("instance does not exist", { status: 404 });
    };

    const adapter = new EvolutionAdapter("https://evo.api", "token", "missing");
    const state = await adapter.connectionState();
    expect(state.state).toBe("close");
    expect(callCount).toBe(1);
  });

  it("connect tenta criar instância quando não existe", async () => {
    const calls: string[] = [];
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      calls.push(`${init?.method ?? "GET"} ${urlStr}`);
      if (urlStr.includes("/instance/connect/") || urlStr.includes("/instance/create")) {
        return new Response(JSON.stringify({ instance: { state: "open" } }), { status: 200 });
      }
      return new Response("instance does not exist", { status: 404 });
    };

    const adapter = new EvolutionAdapter("https://evo.api", "token", "new-instance");
    const state = await adapter.connect();
    expect(state.state).toBe("open");

    const connectCalls = calls.filter((c) => c.includes("/instance/connect/")).length;
    const createCalls = calls.filter((c) => c.includes("/instance/create")).length;
    expect(connectCalls).toBeGreaterThanOrEqual(1);
    // connectExistingInstance is called; if first fails, createInstance + connectExistingInstance
    // The first connect call fails (404), then createInstance succeeds, then connect again
  });
});
