import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AsaasBillingAdapter } from "./asaas";

describe("AsaasBillingAdapter parseWebhook", () => {
  let adapter: AsaasBillingAdapter;

  beforeEach(() => {
    adapter = new AsaasBillingAdapter("", "http://mock.base");
  });

  it("retorna null para payload nulo", () => {
    expect(adapter.parseWebhook(null)).toBeNull();
  });

  it("retorna null para payload não objeto", () => {
    expect(adapter.parseWebhook("string")).toBeNull();
    expect(adapter.parseWebhook(42)).toBeNull();
  });

  it("retorna null quando payment.id não é string", () => {
    expect(adapter.parseWebhook({ event: "PAYMENT_RECEIVED", payment: { id: 123 } })).toBeNull();
  });

  it("retorna null quando payment está ausente", () => {
    expect(adapter.parseWebhook({ event: "PAYMENT_RECEIVED" })).toBeNull();
  });

  it("parse PAYMENT_RECEIVED como paid", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_123", value: 1500, paymentDate: "2026-07-10T10:00:00.000Z", externalReference: "inst-001" },
    });
    expect(result).toEqual({
      externalId: "pay_123",
      reference: "inst-001",
      paidAmount: 1500,
      paidAt: "2026-07-10T10:00:00.000Z",
      event: "paid",
    });
  });

  it("parse PAYMENT_CONFIRMED como paid", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_456", value: 2000, paymentDate: "2026-07-11T12:00:00.000Z" },
    });
    expect(result?.event).toBe("paid");
  });

  it("parse PAYMENT_REFUNDED como refunded", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_REFUNDED",
      payment: { id: "pay_789", value: 500, paymentDate: "2026-07-12T08:00:00.000Z" },
    });
    expect(result?.event).toBe("refunded");
  });

  it("parse PAYMENT_REFUND_IN_PROGRESS como failed (só PAYMENT_REFUNDED é refunded)", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_REFUND_IN_PROGRESS",
      payment: { id: "pay_abc", value: 300, paymentDate: "2026-07-13T09:00:00.000Z" },
    });
    expect(result?.event).toBe("failed");
  });

  it("qualquer outro evento é failed", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_OVERDUE",
      payment: { id: "pay_def", value: 1000, paymentDate: "2026-07-14T10:00:00.000Z" },
    });
    expect(result?.event).toBe("failed");
  });

  it("usa fallback paidAt quando paymentDate não é string", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_ghi", value: 100, paymentDate: 12345 },
    });
    expect(typeof result?.paidAt).toBe("string");
  });

  it("usa 0 como paidAmount quando value não é number", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_jkl", value: "cem" },
    });
    expect(result?.paidAmount).toBe(0);
  });

  it("usa null como reference quando externalReference não é string", () => {
    const result = adapter.parseWebhook({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_mno", value: 200, paymentDate: "2026-07-15T10:00:00.000Z", externalReference: 999 },
    });
    expect(result?.reference).toBeNull();
  });
});

describe("AsaasBillingAdapter fallback (sem API key)", () => {
  let adapter: AsaasBillingAdapter;

  beforeEach(() => {
    adapter = new AsaasBillingAdapter("", "http://mock.base");
  });

  it("createCharge delega ao mock quando não configurado", async () => {
    const result = await adapter.createCharge({
      reference: "test-ref-1",
      method: "boleto",
      amount: 100,
      dueDate: "2026-08-01",
    });
    expect(result.externalId).toBe("mock_chg_test-ref-1");
    expect(result.boletoUrl).toContain("mock.billing.local");
  });

  it("createCharge com pix retorna pixPayload do mock", async () => {
    const result = await adapter.createCharge({
      reference: "test-ref-pix",
      method: "pix",
      amount: 250,
      dueDate: "2026-08-15",
    });
    expect(result.pixPayload).toContain("MOCKPIX");
  });

  it("cancelCharge não lança quando não configurado", async () => {
    await expect(adapter.cancelCharge("ext-123")).resolves.toBeUndefined();
  });
});

describe("AsaasBillingAdapter com API key (fetch mockado)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("createCharge envia access_token e encontra cliente existente", async () => {
    const requests: Array<{ url: string; headers: Record<string, string>; method: string }> = [];
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      requests.push({
        url: urlStr,
        headers: (init?.headers as Record<string, string>) ?? {},
        method: (init?.method as string) ?? "GET",
      });
      // Primeira chamada: busca cliente por documento → retorna existente
      if (urlStr.includes("/customers?cpfCnpj=")) {
        return new Response(JSON.stringify({ data: [{ id: "existing_cust_001" }] }), { status: 200 });
      }
      // Segunda chamada: criação do pagamento
      return new Response(JSON.stringify({ id: "pay_custom_001", bankSlipUrl: "https://asaas.com/boleto/123" }), { status: 200 });
    };

    const adapter = new AsaasBillingAdapter("test_api_key_123", "https://api.asaas.com/v3");
    const result = await adapter.createCharge({
      reference: "ref-1",
      method: "boleto",
      amount: 500,
      dueDate: "2026-09-01",
      customerName: "Teste Cliente",
      customerDocument: "123.456.789-00",
    });

    expect(requests.length).toBe(2);
    expect(requests[0].url).toContain("/customers?cpfCnpj=12345678900");
    expect(requests[0].headers["access_token"]).toBe("test_api_key_123");
    expect(requests[1].url).toContain("/payments");
    expect(requests[1].headers["access_token"]).toBe("test_api_key_123");
    expect(result.externalId).toBe("pay_custom_001");
  });

  it("createCharge fallback ao mock quando API retorna erro", async () => {
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ errors: [{ description: "Saldo insuficiente" }] }), { status: 400 });
    };

    const adapter = new AsaasBillingAdapter("invalid_key", "https://api.asaas.com/v3");
    await expect(adapter.createCharge({
      reference: "ref-2",
      method: "boleto",
      amount: 100,
      dueDate: "2026-09-01",
    })).rejects.toThrow("Saldo insuficiente");
  });

  it("cancelCharge envia DELETE para o endpoint correto", async () => {
    let method = "";
    let path = "";
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      method = init?.method ?? "";
      path = url.toString();
      return new Response(JSON.stringify({}), { status: 200 });
    };

    const adapter = new AsaasBillingAdapter("key", "https://api.asaas.com/v3");
    await adapter.cancelCharge("pay_999");
    expect(method).toBe("DELETE");
    expect(path).toContain("/payments/pay_999");
  });
});
