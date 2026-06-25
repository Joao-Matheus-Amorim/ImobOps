// Asaas billing adapter. Typed against the Asaas REST API (v3). The wiring to the
// live API is implemented in the "Asaas real" cut (Onda E); until then it degrades
// to the mock so the app never breaks without credentials. See
// docs/pm/07_PLANO_DE_COBRANCA.md.

import type {
  BillingAdapter,
  CreateChargeRequest,
  CreateChargeResult,
  PaymentEvent,
} from "./provider";
import { MockBillingAdapter } from "./mock";

// Maps our internal method to the Asaas billingType. PIX/boleto share the BOLETO
// flow at creation (Asaas returns both a bank slip and a PIX QR for it); we request
// the explicit type so the right payload is populated.
const BILLING_TYPE: Record<CreateChargeRequest["method"], string> = {
  boleto: "BOLETO",
  pix: "PIX",
  cartao: "CREDIT_CARD",
};

// Strip non-digits from a cpf/cnpj for Asaas.
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export class AsaasBillingAdapter implements BillingAdapter {
  readonly provider = "asaas" as const;
  private readonly fallback = new MockBillingAdapter();

  constructor(
    private readonly apiKey = process.env.ASAAS_API_KEY ?? "",
    private readonly baseUrl = process.env.ASAAS_BASE_URL ??
      "https://api.asaas.com/v3",
  ) {}

  private get configured(): boolean {
    return Boolean(this.apiKey);
  }

  // Authenticated JSON request against the Asaas API. Throws on non-2xx with the
  // gateway error message so the repository can record a "falha" charge.
  private async api<T>(
    path: string,
    init: { method: string; body?: unknown },
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init.method,
      headers: {
        "content-type": "application/json",
        access_token: this.apiKey,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const msg =
        json?.errors?.[0]?.description ?? `Asaas ${res.status} em ${path}`;
      throw new Error(msg);
    }
    return json as T;
  }

  // Find an existing customer by document, or create one. Asaas requires a
  // customer id to open a payment.
  private async ensureCustomer(req: CreateChargeRequest): Promise<string> {
    const doc = req.customerDocument ? onlyDigits(req.customerDocument) : "";
    if (doc) {
      const found = await this.api<{ data?: Array<{ id: string }> }>(
        `/customers?cpfCnpj=${doc}`,
        { method: "GET" },
      );
      const existing = found.data?.[0]?.id;
      if (existing) return existing;
    }
    const created = await this.api<{ id: string }>("/customers", {
      method: "POST",
      body: {
        name: req.customerName ?? "Cliente",
        cpfCnpj: doc || undefined,
      },
    });
    return created.id;
  }

  async createCharge(req: CreateChargeRequest): Promise<CreateChargeResult> {
    if (!this.configured) return this.fallback.createCharge(req);

    const customer = await this.ensureCustomer(req);
    const payment = await this.api<{ id: string; bankSlipUrl?: string | null }>(
      "/payments",
      {
        method: "POST",
        body: {
          customer,
          billingType: BILLING_TYPE[req.method],
          value: req.amount,
          dueDate: req.dueDate,
          description: req.description,
          externalReference: req.reference,
        },
      },
    );

    let pixPayload: string | null = null;
    if (req.method === "pix") {
      const pix = await this.api<{ payload?: string }>(
        `/payments/${payment.id}/pixQrCode`,
        { method: "GET" },
      ).catch(() => ({ payload: undefined }));
      pixPayload = pix.payload ?? null;
    }

    return {
      externalId: payment.id,
      boletoUrl: payment.bankSlipUrl ?? null,
      pixPayload,
    };
  }

  async cancelCharge(externalId: string): Promise<void> {
    if (!this.configured) return this.fallback.cancelCharge(externalId);
    await this.api(`/payments/${externalId}`, { method: "DELETE" });
  }

  // Asaas posts { event, payment: { id, value, paymentDate, externalReference } }.
  parseWebhook(payload: unknown): PaymentEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const payment = p.payment as Record<string, unknown> | undefined;
    if (!payment || typeof payment.id !== "string") return null;
    const rawEvent = typeof p.event === "string" ? p.event : "";
    const event: PaymentEvent["event"] = rawEvent.startsWith("PAYMENT_REFUNDED")
      ? "refunded"
      : rawEvent === "PAYMENT_RECEIVED" || rawEvent === "PAYMENT_CONFIRMED"
        ? "paid"
        : "failed";
    return {
      externalId: payment.id,
      reference:
        typeof payment.externalReference === "string"
          ? payment.externalReference
          : null,
      paidAmount: typeof payment.value === "number" ? payment.value : 0,
      paidAt:
        typeof payment.paymentDate === "string"
          ? payment.paymentDate
          : new Date().toISOString(),
      event,
    };
  }
}
