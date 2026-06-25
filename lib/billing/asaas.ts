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

// Asaas billing types maps our internal method to Asaas billingType.
const BILLING_TYPE: Record<CreateChargeRequest["method"], string> = {
  boleto: "BOLETO",
  pix: "PIX",
  cartao: "CREDIT_CARD",
};

export class AsaasBillingAdapter implements BillingAdapter {
  readonly provider = "asaas" as const;
  private readonly fallback = new MockBillingAdapter();

  // baseUrl is wired in Onda E (live HTTP calls); kept for typed configuration.
  constructor(
    private readonly apiKey = process.env.ASAAS_API_KEY ?? "",
    private readonly baseUrl = process.env.ASAAS_BASE_URL ??
      "https://api.asaas.com/v3",
  ) {}

  // The payments endpoint used by Onda E.
  private get paymentsUrl(): string {
    return `${this.baseUrl}/payments`;
  }

  private get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async createCharge(req: CreateChargeRequest): Promise<CreateChargeResult> {
    if (!this.configured) return this.fallback.createCharge(req);
    // Onda E: POST `${paymentsUrl}` with access_token header and
    // { billingType: BILLING_TYPE[req.method], value, dueDate, externalReference }.
    void BILLING_TYPE;
    void this.paymentsUrl;
    throw new Error("AsaasBillingAdapter.createCharge ainda não implementado (Onda E).");
  }

  async cancelCharge(externalId: string): Promise<void> {
    if (!this.configured) return this.fallback.cancelCharge(externalId);
    throw new Error("AsaasBillingAdapter.cancelCharge ainda não implementado (Onda E).");
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
